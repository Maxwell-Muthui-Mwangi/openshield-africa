import {createHash} from 'node:crypto';

const key=(purpose,kind,value)=>createHash('sha256').update('mail:'+purpose+':'+kind+':'+value).digest('hex');
const sql=`
INSERT INTO auth_request_buckets(bucket_key,attempts,window_start)
VALUES($1,1,now())
ON CONFLICT(bucket_key) DO UPDATE SET
 attempts=CASE WHEN auth_request_buckets.window_start<=now()-interval '1 hour' THEN 1 ELSE auth_request_buckets.attempts+1 END,
 window_start=CASE WHEN auth_request_buckets.window_start<=now()-interval '1 hour' THEN now() ELSE auth_request_buckets.window_start END
RETURNING attempts`;

export async function allowEmailRequest(dbQuery,purpose,email,ip){
 if(!['reset','resend'].includes(purpose))throw Error('Invalid mail request type');
 const normalized=String(email||'').trim().toLowerCase().slice(0,254);
 const account=key(purpose,'email',normalized);
 const source=key(purpose,'ip',String(ip));
 const [a,b]=await Promise.all([dbQuery(sql,[account]),dbQuery(sql,[source])]);
 return Number(a.rows[0].attempts)<=3&&Number(b.rows[0].attempts)<=12;
}
