import {newToken,sessionHash} from './auth.js';

export async function issueEmailToken(dbQuery,userId,purpose){
 if(!['verify','reset'].includes(purpose))throw Error('Invalid email token purpose.');
 const token=newToken();
 const minutes=purpose==='verify'?60:20;
 await dbQuery('DELETE FROM email_tokens WHERE user_id=$1 AND purpose=$2',[userId,purpose]);
 await dbQuery("INSERT INTO email_tokens(user_id,purpose,token_hash,expires_at) VALUES($1,$2,$3,now()+($4::int * interval '1 minute'))",[userId,purpose,sessionHash(token),minutes]);
 return token;
}

export async function consumeEmailToken(dbQuery,token,purpose){
 if(typeof token!=='string'||token.length<30||token.length>128)return null;
 const result=await dbQuery(
  "UPDATE email_tokens SET consumed_at=now() WHERE token_hash=$1 AND purpose=$2 AND consumed_at IS NULL AND expires_at>now() RETURNING user_id",
  [sessionHash(token),purpose]);
 return result.rows[0]?.user_id||null;
}

export function authLink(origin,path,token){
 const url=new URL(path,origin);
 url.searchParams.set('token',token);
 return url.toString();
}
