import {database} from './database.js';
import {newToken,sessionHash} from './auth.js';
import {authLink} from './email-tokens.js';
import {encryptMessage} from './outbox-crypto.js';

// The token and encrypted outbox job are committed in one transaction.
// A row lock serializes simultaneous resends for the same account.
export async function queueAuthEmail({userId,email,purpose},pool=database()){
 if(!['verify','reset'].includes(purpose))throw Error('Invalid email purpose.');
 const token=newToken();
 const minutes=purpose==='verify'?60:20;
 const path=purpose==='verify'?'/verify-email':'/reset-password';
 const subject=purpose==='verify'?'Verify your OpenShield Africa email':'Reset your OpenShield Africa password';
 const link=authLink(process.env.APP_ORIGIN||'http://localhost:5173',path,token);
 const encrypted=encryptMessage({
  to:email,subject,
  text:(purpose==='verify'?'Verify your account: ':'Reset your password: ')+link
 });
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const owner=await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[userId]);
  if(!owner.rows.length)throw Error('Account no longer exists.');
  await client.query('DELETE FROM email_tokens WHERE user_id=$1 AND purpose=$2',[userId,purpose]);
  // Cancel queued and leased messages carrying links invalidated by rotation.
  await client.query(`UPDATE email_outbox SET status='dead',lease_until=NULL,lease_id=NULL,
    payload='\\x'::bytea,iv='\\x'::bytea,auth_tag='\\x'::bytea
    WHERE user_id=$1 AND purpose=$2 AND status IN ('pending','sending')`,[userId,purpose]);
  await client.query(`INSERT INTO email_tokens(user_id,purpose,token_hash,expires_at)
   VALUES($1,$2,$3,now()+($4::int * interval '1 minute'))`,[userId,purpose,sessionHash(token),minutes]);
  const job=await client.query(`INSERT INTO email_outbox
   (user_id,purpose,payload,iv,auth_tag,expires_at)
   VALUES($1,$2,$3,$4,$5,now()+($6::int * interval '1 minute')) RETURNING id`,
   [userId,purpose,encrypted.payload,encrypted.iv,encrypted.authTag,minutes]);
  await client.query('COMMIT');
  return job.rows[0].id;
 }catch(error){await client.query('ROLLBACK');throw error}
 finally{client.release()}
}
