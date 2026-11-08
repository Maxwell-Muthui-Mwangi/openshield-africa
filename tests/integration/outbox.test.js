import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
const url=process.env.INTEGRATION_DATABASE_URL;
if(!url||!new URL(url).pathname.endsWith('_test'))throw Error('Dedicated _test database required.');
process.env.DATABASE_URL=url;
process.env.DB_MODE='self-hosted';
process.env.OUTBOX_ENCRYPTION_KEY=randomBytes(32).toString('hex');
const {database,query}=await import('../../server/database.js');
const {queueAuthEmail}=await import('../../server/outbox.js');
const {processOutboxBatch}=await import('../../server/outbox-worker.js');

test('transactional encrypted email outbox retries, rotates and dead-letters', {timeout:30000},async()=>{
 const email='outbox-'+randomUUID()+'@example.org';
 const user=(await query("INSERT INTO users(email,password_hash) VALUES($1,'test-fixture') RETURNING id",[email])).rows[0];
 try{
  const id=await queueAuthEmail({userId:user.id,email,purpose:'verify'});
  const queued=(await query('SELECT * FROM email_outbox WHERE id=$1',[id])).rows[0];
  assert.equal(queued.status,'pending');
  assert.equal(queued.payload.includes(Buffer.from(email)),false,'email address must be encrypted at rest');
  let attempted=0;
  let r=await processOutboxBatch({sendMail:async()=>{attempted++;throw Object.assign(Error('temporary'),{code:'SMTP_TEMP'})}});
  assert.equal(r.failed,1);assert.equal(attempted,1);
  const retry=(await query('SELECT attempts,status,last_error_code FROM email_outbox WHERE id=$1',[id])).rows[0];
  assert.equal(retry.attempts,1);assert.equal(retry.status,'pending');assert.equal(retry.last_error_code,'DELIVERY_FAILED');
  await query('UPDATE email_outbox SET available_at=now()-interval \'1 second\' WHERE id=$1',[id]);
  const delivered=[];
  r=await processOutboxBatch({sendMail:async m=>delivered.push(m)});
  assert.equal(r.sent,1);assert.equal(delivered.length,1);
  assert.equal(delivered[0].to,email);
  const after=(await query('SELECT status,octet_length(payload) AS size FROM email_outbox WHERE id=$1',[id])).rows[0];
  assert.equal(after.status,'sent');assert.equal(after.size,0,'sensitive ciphertext must be purged on delivery');

  const rotated=await queueAuthEmail({userId:user.id,email,purpose:'verify'});
  const replaced=await queueAuthEmail({userId:user.id,email,purpose:'verify'});
  assert.notEqual(rotated,replaced);
  assert.equal((await query('SELECT status,octet_length(payload) AS size FROM email_outbox WHERE id=$1',[rotated])).rows[0].status,'dead');
  await query("UPDATE email_outbox SET attempts=max_attempts-1 WHERE id=$1",[replaced]);
  r=await processOutboxBatch({sendMail:async()=>{throw Object.assign(Error('permanent'),{code:'SMTP_PERM'})}});
  assert.equal(r.failed,1);
  const dead=(await query('SELECT status FROM email_outbox WHERE id=$1',[replaced])).rows[0];
  assert.equal(dead.status,'dead');
 }finally{
  await query('DELETE FROM users WHERE id=$1',[user.id]);
  await database().end();
 }
});
