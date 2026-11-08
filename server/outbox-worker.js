import {database} from './database.js';
import {decryptMessage} from './outbox-crypto.js';
import {sendAuthEmail} from './mailer.js';

export async function processOutboxBatch({pool=database(),sendMail=sendAuthEmail,limit=10}={}){
 const claimed=await pool.query(`
  WITH due AS (
   SELECT id FROM email_outbox
   WHERE ((status='pending' AND available_at<=now()) OR (status='sending' AND lease_until<now()))
     AND expires_at>now() AND attempts<max_attempts
   ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT $1
  )
  UPDATE email_outbox o SET status='sending',attempts=attempts+1,lease_until=now()+interval '2 minutes'
  FROM due WHERE o.id=due.id
  RETURNING o.*`,[limit]);
 let sent=0,failed=0;
 for(const job of claimed.rows){
  try{
   await sendMail(decryptMessage(job));
   await pool.query("UPDATE email_outbox SET status='sent',sent_at=now(),lease_until=NULL,payload='\\x'::bytea,iv='\\x'::bytea,auth_tag='\\x'::bytea WHERE id=$1 AND status='sending' AND attempts=$2",[job.id,job.attempts]);
   sent++;
  }catch(error){
   const dead=job.attempts>=job.max_attempts||new Date(job.expires_at)<=new Date();
   const seconds=Math.min(300,5*2**Math.min(job.attempts,6));
   await pool.query("UPDATE email_outbox SET status=$2,available_at=now()+($3::int*interval '1 second'),lease_until=NULL,last_error_code=$4 WHERE id=$1 AND status='sending' AND attempts=$5",
    [job.id,dead?'dead':'pending',seconds,String(error.code||error.name||'delivery_error').slice(0,80),job.attempts]);
   failed++;
  }
 }
 await pool.query("UPDATE email_outbox SET status='dead',lease_until=NULL,payload='\\x'::bytea,iv='\\x'::bytea,auth_tag='\\x'::bytea WHERE status IN ('pending','sending') AND (expires_at<=now() OR attempts>=max_attempts AND lease_until<now())");
 return {claimed:claimed.rows.length,sent,failed};
}
