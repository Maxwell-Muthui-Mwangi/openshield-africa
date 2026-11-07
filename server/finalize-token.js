import {database} from './database.js';
import {sessionHash} from './auth.js';

// Transaction holds a row lock until account changes and session revocation commit.
export async function finalizeEmailToken(token,purpose,passwordHash=null,pool=database()){
 if(typeof token!=='string'||token.length<30||token.length>128||!['verify','reset'].includes(purpose))return false;
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const r=await client.query(
   "SELECT id,user_id FROM email_tokens WHERE token_hash=$1 AND purpose=$2 AND consumed_at IS NULL AND expires_at>now() FOR UPDATE",
   [sessionHash(token),purpose]);
  if(!r.rows.length){await client.query('ROLLBACK');return false;}
  const {id,user_id}=r.rows[0];
  if(purpose==='verify'){
   await client.query('UPDATE users SET email_verified_at=COALESCE(email_verified_at,now()) WHERE id=$1',[user_id]);
  }else{
   if(typeof passwordHash!=='string')throw Error('Password hash required.');
   await client.query('UPDATE users SET password_hash=$1 WHERE id=$2',[passwordHash,user_id]);
   await client.query('DELETE FROM sessions WHERE user_id=$1',[user_id]);
  }
  await client.query('UPDATE email_tokens SET consumed_at=now() WHERE id=$1',[id]);
  await client.query('COMMIT');
  return true;
 }catch(error){await client.query('ROLLBACK');throw error}
 finally{client.release()}
}
