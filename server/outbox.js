import {database} from './database.js';
import {newToken,sessionHash} from './auth.js';
import {authLink} from './email-tokens.js';
import {encryptMessage} from './outbox-crypto.js';

// The token row and encrypted email job are committed together.
// A worker may send at least once; email providers do not guarantee exactly-once delivery.
export async function queueAuthEmail({userId,email,purpose},pool=database()){
 if(!['verify','reset'].includes(purpose))throw Error('Invalid email purpose.');
 const token=newToken();
 const minutes=purpose==='verify'?60:20;
 const path=purpose==='verify'?'/verify-email':'/reset-password';
 const subject=purpose==='verify'?'Verify your OpenShield Africa email':'Reset your OpenShield Africa password';
 const link=authLink(process.env.APP_ORIGIN||'http://localhost:5173',path,token);
 const message={to:email,subject,text:(purpose==='verify'?'Verify your account: ':'Reset your password: ')+link};
 const encrypted=encryptMessage(message);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('DELETE FROM email_tokens WHERE user_id=$1 AND purpose=$2',[userId,purpose]);
  // Remove queued stale links when rotating the token.
  await client.query("DELETE FROM email_outbox WHERE user_id=$1 AND purpose=$2 AND status='pending'",[userId,purpose]);
  await client.query("INSERT INTO email_tokens(user_id,purpose,token_hash,expires_at) VALUES($1,$2,$3,now()+($4::int * interval '1 minute'))",[userId,purpose,sessionHash(token),minutes]);
  const job=await client.query("INSERT INTO email_outbox(user_id,purpose,payload,iv,auth_tag,expires_at) VALUES($1,$2,$3,$4,$5,now()+($6::int * interval '1 minute')) RETURNING id",[userId,purpose,encrypted.payload,encrypted.iv,encrypted.authTag,minutes]);
  await client.query('COMMIT');
  return job.rows[0].id;
 }catch(error){await client.query('ROLLBACK');throw error}
 finally{client.release()}
}
