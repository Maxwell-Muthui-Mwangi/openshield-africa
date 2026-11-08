import {randomUUID} from 'node:crypto';
import {database} from './database.js';
import {decryptMessage} from './outbox-crypto.js';
import {sendAuthEmail} from './mailer.js';

// A unique lease ID prevents an obsolete worker from acknowledging a reclaimed job.
export async function processOutboxBatch({pool=database(),sendMail=sendAuthEmail,limit=10}={}){
 if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('Batch limit must be 1–100.');
 // Expire obsolete jobs BEFORE claiming; do not dispatch expired authentication links.
 await pool.query(`UPDATE email_outbox
  SET status='dead',lease_until=NULL,lease_id=NULL,payload='\\x'::bytea,iv='\\x'::bytea,auth_tag='\\x'::bytea
  WHERE status IN ('pending','sending') AND
  (expires_at<=now() OR (attempts>=max_attempts AND (lease_until IS NULL OR lease_until<now())))`);
 const leaseId=randomUUID();
 const claimed=await pool.query(`
  WITH due AS (
    SELECT id FROM email_outbox
    WHERE (
      (status='pending' AND available_at<=now()) OR
      (status='sending' AND lease_until<now())
    ) AND expires_at>now() AND attempts<max_attempts
    ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT $1
  )
  UPDATE email_outbox o
  SET status='sending',attempts=o.attempts+1,lease_id=$2,
      claimed_at=now(),lease_until=now()+interval '2 minutes'
  FROM due WHERE o.id=due.id RETURNING o.*`,[limit,leaseId]);
 let sent=0,failed=0,stale=0;
 for(const job of claimed.rows){
  try{
   // A rescinded or expired token must never be sent. This check is close to
   // delivery; rotation also invalidates already-issued links server-side.
   const eligible=await pool.query(`SELECT EXISTS(
     SELECT 1 FROM email_tokens t
     WHERE t.user_id=$1 AND t.purpose=$2
       AND t.consumed_at IS NULL AND t.expires_at>now()
   ) AS eligible`,[job.user_id,job.purpose]);
   if(!eligible.rows[0]?.eligible||new Date(job.expires_at)<=new Date()){
    await pool.query(`UPDATE email_outbox SET status='dead',lease_until=NULL,lease_id=NULL,
      payload='\\x'::bytea,iv='\\x'::bytea,auth_tag='\\x'::bytea
      WHERE id=$1 AND lease_id=$2 AND status='sending'`,[job.id,leaseId]);
    stale++;
    continue;
   }
   await sendMail(decryptMessage(job));
   const ack=await pool.query(`UPDATE email_outbox
    SET status='sent',sent_at=now(),lease_until=NULL,lease_id=NULL,
        payload='\\x'::bytea,iv='\\x'::bytea,auth_tag='\\x'::bytea
    WHERE id=$1 AND status='sending' AND lease_id=$2 RETURNING id`,[job.id,leaseId]);
   if(ack.rowCount)sent++;else stale++;
  }catch(error){
   const dead=job.attempts>=job.max_attempts||new Date(job.expires_at)<=new Date();
   const seconds=Math.min(300,5*2**Math.min(job.attempts,6));
   // Fixed error-code allowlist: error text may include credentials, addresses or URLs.
   const retryableCodes=new Set(['ETIMEDOUT','ECONNRESET','ECONNREFUSED','ENOTFOUND','ESOCKET','ECONNECTION','ETLS','EAUTH']);
   const code=retryableCodes.has(error.code)?error.code:'DELIVERY_FAILED';
   const ack=await pool.query(`UPDATE email_outbox
     SET status=$2,available_at=now()+($3::int*interval '1 second'),
         lease_until=NULL,lease_id=NULL,last_error_code=$4,
         payload=CASE WHEN $2='dead' THEN '\\x'::bytea ELSE payload END,
         iv=CASE WHEN $2='dead' THEN '\\x'::bytea ELSE iv END,
         auth_tag=CASE WHEN $2='dead' THEN '\\x'::bytea ELSE auth_tag END
     WHERE id=$1 AND lease_id=$5 AND status='sending' RETURNING id`,
    [job.id,dead?'dead':'pending',seconds,code,leaseId]);
   if(ack.rowCount)failed++;else stale++;
  }
 }
 return {claimed:claimed.rows.length,sent,failed,stale};
}
