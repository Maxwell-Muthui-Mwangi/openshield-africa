import {createHash} from 'node:crypto';

const accountKey=email=>'account:'+email.toLowerCase().trim();
const ipKey=ip=>'ip:'+ip;
export function loginBucketKey(kind,value){
 if(!['account','ip'].includes(kind)||typeof value!=='string')throw Error('Invalid login bucket.');
 return createHash('sha256').update(kind==='account'?accountKey(value):ipKey(value)).digest('hex');
}

const bumpSql=`
INSERT INTO login_buckets(bucket_key,attempts,window_start)
VALUES($1,1,now())
ON CONFLICT(bucket_key) DO UPDATE
SET attempts=CASE
 WHEN login_buckets.window_start <= now()-interval '15 minutes' THEN 1
 ELSE login_buckets.attempts+1 END,
 window_start=CASE
 WHEN login_buckets.window_start <= now()-interval '15 minutes' THEN now()
 ELSE login_buckets.window_start END
RETURNING attempts`;

export async function consumeLoginBudget(dbQuery,email,ip){
 // Persist both identity and source budgets across API instances.
 // All attempts, successful or not, consume budget until the account
 // budget is cleared by a successful login. Source budget is never
 // cleared by logging in to a different account.
 const account=loginBucketKey('account',email);
 const source=loginBucketKey('ip',ip);
 const [a,b]=await Promise.all([
  dbQuery(bumpSql,[account]),
  dbQuery(bumpSql,[source])
 ]);
 const accountAttempts=Number(a.rows[0].attempts);
 const sourceAttempts=Number(b.rows[0].attempts);
 return {allowed:accountAttempts<=5&&sourceAttempts<=30,account};
}
export async function resetSuccessfulAccountBudget(dbQuery,email){
 await dbQuery('DELETE FROM login_buckets WHERE bucket_key=$1',[loginBucketKey('account',email)]);
}
