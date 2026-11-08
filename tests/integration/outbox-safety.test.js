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

test('parallel claimers deliver one queued message exactly once without a crash', {timeout:30000},async()=>{
 const email='concurrency-'+randomUUID()+'@example.org';
 const user=(await query("INSERT INTO users(email,password_hash) VALUES($1,'test-fixture') RETURNING id",[email])).rows[0];
 try{
  const id=await queueAuthEmail({userId:user.id,email,purpose:'verify'});
  const deliveries=[];
  const sendMail=async message=>{deliveries.push(message.to);await new Promise(resolve=>setTimeout(resolve,20))};
  const [a,b]=await Promise.all([
   processOutboxBatch({sendMail,limit:1}),
   processOutboxBatch({sendMail,limit:1})
  ]);
  assert.equal(a.sent+b.sent,1);
  assert.deepEqual(deliveries,[email]);
  const job=(await query('SELECT status,lease_id,octet_length(payload) AS bytes FROM email_outbox WHERE id=$1',[id])).rows[0];
  assert.equal(job.status,'sent');assert.equal(job.lease_id,null);assert.equal(job.bytes,0);
 }finally{await query('DELETE FROM users WHERE id=$1',[user.id])}
});

test('resend invalidates and scrubs undelivered previous messages', {timeout:30000},async()=>{
 const email='rotate-'+randomUUID()+'@example.org';
 const user=(await query("INSERT INTO users(email,password_hash) VALUES($1,'test-fixture') RETURNING id",[email])).rows[0];
 try{
  const old=await queueAuthEmail({userId:user.id,email,purpose:'reset'});
  const current=await queueAuthEmail({userId:user.id,email,purpose:'reset'});
  const prev=(await query('SELECT status,octet_length(payload) AS bytes FROM email_outbox WHERE id=$1',[old])).rows[0];
  assert.equal(prev.status,'dead');assert.equal(prev.bytes,0);
  const sends=[];
  const r=await processOutboxBatch({sendMail:async m=>sends.push(m)});
  assert.equal(r.sent,1);assert.equal(sends.length,1);
  const after=(await query('SELECT status FROM email_outbox WHERE id=$1',[current])).rows[0];
  assert.equal(after.status,'sent');
 }finally{await query('DELETE FROM users WHERE id=$1',[user.id])}
});

test('expired jobs are scrubbed and never dispatched', {timeout:30000},async()=>{
 const email='expired-'+randomUUID()+'@example.org';
 const user=(await query("INSERT INTO users(email,password_hash) VALUES($1,'test-fixture') RETURNING id",[email])).rows[0];
 try{
  const id=await queueAuthEmail({userId:user.id,email,purpose:'verify'});
  await query("UPDATE email_outbox SET expires_at=now()-interval '1 minute' WHERE id=$1",[id]);
  const result=await processOutboxBatch({sendMail:async()=>{throw Error('expired email dispatched')}});
  assert.equal(result.sent,0);
  const job=(await query('SELECT status,octet_length(payload) AS bytes FROM email_outbox WHERE id=$1',[id])).rows[0];
  assert.equal(job.status,'dead');assert.equal(job.bytes,0);
 }finally{await query('DELETE FROM users WHERE id=$1',[user.id]);await database().end()}
});
