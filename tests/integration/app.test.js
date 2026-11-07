import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

// A dedicated, disposable PostgreSQL database is mandatory for this suite.
const databaseUrl=process.env.INTEGRATION_DATABASE_URL;
if(!databaseUrl)throw Error('INTEGRATION_DATABASE_URL must identify an isolated test PostgreSQL database.');
const parsed=new URL(databaseUrl);
if(!parsed.pathname.endsWith('_test'))throw Error('Integration tests refuse to run on a database not ending in _test.');
process.env.DATABASE_URL=databaseUrl;
process.env.DB_MODE='self-hosted';
process.env.APP_ORIGIN='http://localhost:5173';

const {createApp}=await import('../../server/index.js');
const {database,query}=await import('../../server/database.js');
const {loginBucketKey}=await import('../../server/login-limit.js');

test('authenticated workflow persists only verified-domain assessments and isolates tenants', {timeout:30000}, async()=>{
 const host='example.org';
 const scanned=[];
 const messages=[];
 const app=createApp({
  rateLimitMax:100,
  sendMail:async message=>{messages.push(message)},
  checkOwnership:async(hostname,token)=>hostname===host&&/^[a-f0-9]{48}$/.test(token),
  runAssessment:async hostname=>{
   scanned.push(hostname);
   return {url:'https://'+hostname,assessedAt:new Date().toISOString(),score:80,
    checks:[{id:'https',status:'pass',severity:'high',name:'HTTPS enabled'}],
    scoreDescription:'Test fixture: no outbound request was made.'};
  }
 });
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+app.address().port;
 const prefix=randomUUID().slice(0,8);
 const first=prefix+'-a@example.org',second=prefix+'-b@example.org';
 const password='a very strong test password!';
 let cookieA='',cookieB='';
 async function request(method,path,body,cookie='',origin='http://localhost:5173'){
  const headers={'Content-Type':'application/json'};
  if(cookie)headers.Cookie=cookie;
  if(method==='POST')headers.Origin=origin;
  const response=await fetch(base+path,{method,headers,body:method==='POST'?JSON.stringify(body||{}):undefined});
  return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
 }
 try{
  let r=await request('GET','/api/auth/me');assert.equal(r.status,401);
  process.env.REGISTRATION_ENABLED='false';
  r=await request('POST','/api/auth/register',{email:first,password});
  assert.equal(r.status,403);
  process.env.REGISTRATION_ENABLED='true';
  r=await request('POST','/api/auth/register',{email:first,password},'','https://malicious.example');
  assert.equal(r.status,400);
  r=await request('POST','/api/auth/register',{email:first,password});
  assert.equal(r.status,201);
  r=await request('POST','/api/auth/register',{email:second,password});
  assert.equal(r.status,201);
  process.env.REGISTRATION_ENABLED='false';
  r=await request('POST','/api/auth/login',{email:first,password});
  assert.equal(r.status,403);
  assert.equal(messages.length,2);
  for(const message of messages.slice(0,2)){
   const link=message.text.split(' ').at(-1);
   assert.ok(link,'verification link should be delivered to test mailer');
   const token=new URL(link).searchParams.get('token');
   r=await request('POST','/api/auth/verify-email',{token});
   assert.equal(r.status,200);
   r=await request('POST','/api/auth/verify-email',{token});
   assert.equal(r.status,400,'verification token must be single-use');
  }

  r=await request('POST','/api/auth/login',{email:first,password:'incorrect credentials'});
  assert.equal(r.status,401);
  r=await request('POST','/api/auth/login',{email:first,password});
  assert.equal(r.status,200);assert.ok(r.cookie?.startsWith('openshield_session='));
  cookieA=r.cookie;
  r=await request('POST','/api/auth/login',{email:second,password});
  assert.equal(r.status,200);cookieB=r.cookie;
  r=await request('GET','/api/auth/me',null,cookieA);
  assert.equal(r.status,200);assert.equal(r.data.user.email,first);

  // Persistent failed-login budgets deny even a valid password after lockout.
  for(let i=0;i<5;i++){
   r=await request('POST','/api/auth/login',{email:first,password:'incorrect credentials'});
   assert.equal(r.status,401);
  }
  r=await request('POST','/api/auth/login',{email:first,password:'incorrect credentials'});
  assert.equal(r.status,429);
  r=await request('POST','/api/auth/login',{email:first,password});
  assert.equal(r.status,429);
  await query('DELETE FROM login_buckets WHERE bucket_key=$1',[loginBucketKey('account',first)]);
  r=await request('POST','/api/auth/login',{email:first,password});
  assert.equal(r.status,200);

  r=await request('POST','/api/domains',{url:'https://example.org'},cookieA);
  assert.equal(r.status,201);
  const id=r.data.domain.id;
  const initialToken=r.data.dnsRecord.value.replace('openshield-verification=','');
  assert.equal(r.data.dnsRecord.name,'_openshield-challenge.example.org');

  r=await request('POST','/api/assess',{url:'https://example.org'},cookieA);
  assert.equal(r.status,403);assert.equal(scanned.length,0);
  r=await request('POST','/api/domains/'+id+'/verify',{token:'a'.repeat(48)},cookieA);
  assert.equal(r.status,403);
  r=await request('POST','/api/domains/'+id+'/verify',{token:initialToken},cookieB);
  assert.equal(r.status,404);
  r=await request('POST','/api/domains/'+id+'/verify',{token:initialToken},cookieA);
  assert.equal(r.status,200);

  r=await request('POST','/api/assess',{url:'https://example.org'},cookieB);
  assert.equal(r.status,403);
  r=await request('POST','/api/assess',{url:'https://example.org'},cookieA);
  assert.equal(r.status,200);assert.equal(r.data.score,80);
  assert.deepEqual(scanned,['example.org']);
  const reportId=r.data.id;
  r=await request('GET','/api/assessments',null,cookieA);
  assert.equal(r.status,200);
  assert.equal(r.data.assessments.some(x=>x.id===reportId),true);
  r=await request('GET','/api/assessments/'+reportId,null,cookieA);
  assert.equal(r.status,200);assert.equal(r.data.score,80);
  r=await request('GET','/api/assessments/'+reportId,null,cookieB);
  assert.equal(r.status,404);
  r=await request('GET','/api/assessments',null,cookieB);
  assert.equal(r.data.assessments.length,0);

  await query("UPDATE domains SET verified_at=now()-interval '31 days' WHERE id=$1",[id]);
  r=await request('POST','/api/assess',{url:'https://example.org'},cookieA);
  assert.equal(r.status,403);assert.equal(scanned.length,1);
  r=await request('POST','/api/domains/'+id+'/renew',{},cookieA);
  assert.equal(r.status,200);
  const renewedToken=r.data.dnsRecord.value.replace('openshield-verification=','');
  assert.notEqual(renewedToken,initialToken);
  r=await request('POST','/api/domains/'+id+'/verify',{token:initialToken},cookieA);
  assert.equal(r.status,403);
  r=await request('POST','/api/domains/'+id+'/verify',{token:renewedToken},cookieA);
  assert.equal(r.status,200);

  // Account recovery does not disclose whether a user exists.
  r=await request('POST','/api/auth/forgot-password',{email:'missing-'+prefix+'@example.org'});
  assert.equal(r.status,200);
  r=await request('POST','/api/auth/forgot-password',{email:first});
  assert.equal(r.status,200);
  const resetLink=messages.at(-1).text.split(' ').at(-1);
  const resetToken=new URL(resetLink).searchParams.get('token');
  r=await request('POST','/api/auth/reset-password',{token:resetToken,password:'a new strong recovery password!'});
  assert.equal(r.status,200);
  r=await request('POST','/api/auth/reset-password',{token:resetToken,password:'another strong password!'});
  assert.equal(r.status,400,'reset token must be single-use');
  r=await request('GET','/api/auth/me',null,cookieA);
  assert.equal(r.status,401,'password recovery revokes existing sessions');
  r=await request('POST','/api/auth/login',{email:first,password});
  assert.equal(r.status,401);
  r=await request('POST','/api/auth/login',{email:first,password:'a new strong recovery password!'});
  assert.equal(r.status,200);
  cookieA=r.cookie;
  r=await request('POST','/api/auth/logout',{},cookieA);
  assert.equal(r.status,200);
  r=await request('GET','/api/auth/me',null,cookieA);
  assert.equal(r.status,401);
 }finally{
  process.env.REGISTRATION_ENABLED='false';
  await query('DELETE FROM users WHERE email=ANY($1::text[])',[[first,second]]);
  await new Promise((resolve,reject)=>app.close(e=>e?reject(e):resolve()));
  await database().end();
 }
});
