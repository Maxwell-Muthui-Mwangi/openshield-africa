import http from 'node:http';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import dns from 'node:dns/promises';
import https from 'node:https';
import {randomBytes} from 'node:crypto';
import {evaluate} from './checks.js';
import {validateTarget,isPublicIPv4,limitWindow} from './safety.js';
import {query,database} from './database.js';
import {createOrganization,listOrganizations,organizationMembers,organizationAccess} from './organizations.js';
import {inviteMember,acceptInvitation,changeMemberRole,addOrganizationAsset,listOrganizationAssets,organizationAudit} from './organization-security.js';
import {hashPassword,verifyPassword,newToken,sessionHash,sessionCookie,readSessionCookie} from './auth.js';
import {canonicalHostname,checkDnsOwnership,hashChallenge} from './ownership.js';
import {consumeLoginBudget,resetSuccessfulAccountBudget} from './login-limit.js';
import {issueEmailToken,consumeEmailToken,authLink} from './email-tokens.js';
import {sendAuthEmail} from './mailer.js';
import {finalizeEmailToken} from './finalize-token.js';
import {allowEmailRequest} from './mail-limit.js';
import {validateDeployment} from './deployment.js';
import {queueAuthEmail} from './outbox.js';
import {configureReassessment,listReassessments} from './reassessment-scheduler.js';
import {addRemediationEvidence,listRemediationEvidence} from './remediation-evidence.js';
import {executivePdf} from './executive-pdf.js';
import {assessOrganizationAsset,organizationReport,updateRemediation} from './organization-assessments.js';
import {verifyOrganizationAsset,renewOrganizationAsset,organizationDashboard} from './organization-dashboard.js';

const PORT=Number(process.env.PORT||8787);
const HOST='127.0.0.1';
const secureCookie=process.env.COOKIE_SECURE==='true';
function json(res,status,data,headers={}){
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",...headers});
 res.end(JSON.stringify(data));
}
async function readBody(req){
 if(req.headers['content-type']?.split(';')[0].trim()!=='application/json')throw Error('JSON content type required.');
 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096)throw Error('Request too large.')}
 return JSON.parse(raw);
}
async function userFromRequest(req,dbQuery){
 const token=readSessionCookie(req.headers.cookie);
 if(!token)return null;
 const result=await dbQuery('SELECT u.id,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',[sessionHash(token)]);
 return result.rows[0]||null;
}
async function assess(hostname){
 if(process.env.LOCAL_SCAN_ENABLED!=='true'||process.env.NODE_ENV==='production')throw Error('Live network assessments are disabled by default.');
 const addresses=await dns.resolve4(hostname);
 if(!addresses.length||addresses.some(ip=>!isPublicIPv4(ip)))throw Error('Restricted or unresolved target address.');
 // Refuse IPv6-capable targets until IPv6 egress validation is independently reviewed.
 let ipv6=[];
 try{ipv6=await dns.resolve6(hostname)}catch(error){if(!['ENODATA','ENOTFOUND','ENODOMAIN'].includes(error.code))throw error}
 if(ipv6.length)throw Error('IPv6-capable targets are not supported by the current scanner.');
 const ip=addresses[0];
 const headers=await new Promise((resolve,reject)=>{
  const req=https.request({hostname,port:443,path:'/',method:'HEAD',timeout:5000,maxRedirects:0,
   lookup:(_hostname,_options,cb)=>cb(null,ip,4),
   headers:{'User-Agent':'OpenShieldAfrica/0.2'}},
   res=>{res.resume();if(res.statusCode>=300&&res.statusCode<400)return reject(Error('Redirects are not followed during assessments.'));resolve(new Headers(res.headers))});
  req.on('timeout',()=>req.destroy(Error('Assessment timed out.')));
  req.on('error',reject);req.end();
 });
 return {url:'https://'+hostname,assessedAt:new Date().toISOString(),...evaluate(headers)};
}
function requireMutationOrigin(req){
 const origin=req.headers.origin;
 const expected=process.env.APP_ORIGIN||'http://localhost:5173';
 if(origin!==expected)throw Error('Invalid request origin.');
}
export function createApp({dbQuery=query,checkOwnership=checkDnsOwnership,runAssessment=assess,rateLimitMax=20,sendMail=sendAuthEmail,finishToken=finalizeEmailToken,queueMail=queueAuthEmail,orgPool=null}={}){
 const usage=new Map();
 return http.createServer(async(req,res)=>{
 try{
  if(req.url==='/api/health'&&req.method==='GET')return json(res,200,{status:'ok',scope:'local-only'});
  if(!req.url?.startsWith('/api/'))return json(res,404,{error:'Not found'});
  const key=req.socket.remoteAddress||'local';
  const limited=limitWindow(Date.now(),usage.get(key),60000,rateLimitMax);usage.set(key,limited.next);
  if(!limited.allowed)return json(res,429,{error:'Request limit reached.'},{'Retry-After':'60'});
  if(usage.size>100){for(const [ip,item] of usage){if(Date.now()-item.start>60000)usage.delete(ip)}}
  if(req.method==='POST')requireMutationOrigin(req);
  if(req.url==='/api/auth/register'&&req.method==='POST'){
   if(process.env.REGISTRATION_ENABLED!=='true')return json(res,403,{error:'Registration is disabled. An administrator must enable it.'});
   const body=await readBody(req);
   const email=String(body.email||'').trim().toLowerCase();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw Error('Valid email required.');
   const passwordHash=await hashPassword(body.password);
   const result=await dbQuery('INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id,email',[email,passwordHash]);
   await queueMail({userId:result.rows[0].id,email,purpose:'verify'});
   return json(res,201,{message:'Account created. Check your email to verify it.'});
  }
  if(req.url==='/api/auth/verify-email'&&req.method==='POST'){
   const body=await readBody(req);
   const completed=await finishToken(body.token,'verify');
   if(!completed)return json(res,400,{error:'Verification link is invalid or expired.'});
   return json(res,200,{message:'Email verified. You can now sign in.'});
  }
  if(req.url==='/api/auth/resend-verification'&&req.method==='POST'){
   const body=await readBody(req);
   const email=String(body.email||'').trim().toLowerCase();
   if(email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&await allowEmailRequest(dbQuery,'resend',email,req.socket.remoteAddress||'unknown')){
    const found=await dbQuery('SELECT id FROM users WHERE email=$1 AND email_verified_at IS NULL',[email]);
    if(found.rows.length){
     await queueMail({userId:found.rows[0].id,email,purpose:'verify'});
    }
   }
   return json(res,200,{message:'If the account needs verification, an email will be sent.'});
  }
  if(req.url==='/api/auth/forgot-password'&&req.method==='POST'){
   const body=await readBody(req);
   const email=String(body.email||'').trim().toLowerCase();
   if(email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&await allowEmailRequest(dbQuery,'reset',email,req.socket.remoteAddress||'unknown')){
    const found=await dbQuery('SELECT id FROM users WHERE email=$1 AND email_verified_at IS NOT NULL',[email]);
    if(found.rows.length){
     await queueMail({userId:found.rows[0].id,email,purpose:'reset'});
    }
   }
   return json(res,200,{message:'If the account is eligible, a recovery email will be sent.'});
  }
  if(req.url==='/api/auth/reset-password'&&req.method==='POST'){
   const body=await readBody(req);
   const passwordHash=await hashPassword(body.password);
   const completed=await finishToken(body.token,'reset',passwordHash);
   if(!completed)return json(res,400,{error:'Recovery link is invalid or expired.'});
   return json(res,200,{message:'Password changed. Sign in again.'});
  }
  if(req.url==='/api/auth/login'&&req.method==='POST'){
   const body=await readBody(req);const email=String(body.email||'').trim().toLowerCase();
   if(email.length>254||typeof body.password!=='string'||body.password.length>256)return json(res,401,{error:'Invalid credentials.'});
   const budget=await consumeLoginBudget(dbQuery,email,req.socket.remoteAddress||'unknown');
   if(!budget.allowed)return json(res,429,{error:'Too many login attempts. Try again later.'},{'Retry-After':'900'});
   const result=await dbQuery('SELECT id,email,password_hash,email_verified_at FROM users WHERE email=$1',[email]);
   const user=result.rows[0];
   if(!user||!await verifyPassword(body.password,user.password_hash))return json(res,401,{error:'Invalid credentials.'});
   if(!user.email_verified_at)return json(res,403,{error:'Verify your email before signing in.'});
   const token=newToken();
   await dbQuery("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",[sessionHash(token),user.id]);
   await resetSuccessfulAccountBudget(dbQuery,email);
   return json(res,200,{user:{id:user.id,email:user.email}},{'Set-Cookie':sessionCookie(token,secureCookie)});
  }
  const user=await userFromRequest(req,dbQuery);
  if(!user)return json(res,401,{error:'Sign in required.'});
  if(req.url==='/api/auth/me'&&req.method==='GET')return json(res,200,{user});
  if(req.url==='/api/auth/logout'&&req.method==='POST'){
   const token=readSessionCookie(req.headers.cookie);
   if(token)await dbQuery('DELETE FROM sessions WHERE token_hash=$1',[sessionHash(token)]);
   return json(res,200,{ok:true},{'Set-Cookie':'openshield_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});
  }
  // Organization resources are membership-gated. Personal domains and reports
  // deliberately remain scoped to their original owner until a reviewed migration.
  if(req.url==='/api/organizations'&&req.method==='GET'){
   return json(res,200,{organizations:await listOrganizations(dbQuery,user.id)});
  }
  if(req.url==='/api/organizations'&&req.method==='POST'){
   if(process.env.ORGANIZATIONS_ENABLED!=='true')return json(res,403,{error:'Organization creation is disabled.'});
   const body=await readBody(req);
   const organization=await createOrganization({name:body.name,slug:body.slug,userId:user.id},orgPool||database());
   return json(res,201,{organization});
  }
  const orgMembers=req.url?.match(/^\/api\/organizations\/([0-9a-f-]{36})\/members$/);
  if(orgMembers&&req.method==='GET'){
   const members=await organizationMembers(dbQuery,orgMembers[1],user.id);
   return members===null?json(res,404,{error:'Organization not found.'}):json(res,200,{members});
  }
  const orgDetail=req.url?.match(/^\/api\/organizations\/([0-9a-f-]{36})$/);
  if(orgDetail&&req.method==='GET'){
   const role=await organizationAccess(dbQuery,orgDetail[1],user.id);
   if(!role)return json(res,404,{error:'Organization not found.'});
   const result=await dbQuery('SELECT id,name,slug,created_at FROM organizations WHERE id=$1',[orgDetail[1]]);
   return json(res,200,{organization:{...result.rows[0],role}});
  }
  const dashboard=req.url?.match(/^\/api\/organizations\/([0-9a-f-]{36})\/dashboard$/);
  if(dashboard&&req.method==='GET'){
   const summary=await organizationDashboard(dbQuery,{orgId:dashboard[1],userId:user.id});
   return summary?json(res,200,{dashboard:summary}):json(res,404,{error:'Organization not found.'});
  }
  const orgReport=req.url?.match(/^\/api\/organizations\/([0-9a-f-]{36})\/report$/);
  if(orgReport&&req.method==='GET'){
   const result=await organizationReport(dbQuery,{orgId:orgReport[1],userId:user.id});
   return result?json(res,200,{report:result}):json(res,404,{error:'Organization not found.'});
  }
  const pdfReport=req.url?.match(/^\/api\/organizations\/([0-9a-f-]{36})\/report\.pdf$/);
  if(pdfReport&&req.method==='GET'){
   const result=await organizationReport(dbQuery,{orgId:pdfReport[1],userId:user.id});
   if(!result)return json(res,404,{error:'Organization not found.'});
   const pdf=executivePdf(result);
   res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="openshield-executive-report.pdf"','Content-Length':pdf.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   return res.end(pdf);
  }
  const schedules=req.url?.match(/^\/api\/organizations\/([0-9a-f-]{36})\/reassessments$/);
  if(schedules&&req.method==='GET'){
   const result=await listReassessments(dbQuery,{orgId:schedules[1],userId:user.id});
   return result?json(res,200,{schedules:result}):json(res,404,{error:'Organization not found.'});
  }
  // Organization mutations are opt-in for private staging.
  if(process.env.ORGANIZATIONS_ENABLED==='true'){
   if(req.url==='/api/organizations/invitations/accept'&&req.method==='POST'){
    const body=await readBody(req);
    const accepted=await acceptInvitation(orgPool||database(),{token:body.token,userId:user.id,email:user.email});
    return accepted?json(res,200,{accepted:true}):json(res,400,{error:'Invalid or expired invitation.'});
   }
   const invitation=req.url?.match(/^\/api\/organizations\/([0-9a-f-]{36})\/invitations$/);
   if(invitation&&req.method==='POST'){
    const body=await readBody(req);
    const result=await inviteMember(orgPool||database(),{orgId:invitation[1],actorId:user.id,email:body.email,role:body.role});
    return json(res,201,{invitation:result});
   }
   const memberRole=req.url?.match(/^\/api\/organizations\/([0-9a-f-]{36})\/members\/([0-9a-f-]{36})\/role$/);
   if(memberRole&&req.method==='POST'){
    const body=await readBody(req);
    const updated=await changeMemberRole(orgPool||database(),{orgId:memberRole[1],actorId:user.id,targetId:memberRole[2],role:body.role});
    return updated?json(res,200,{updated:true}):json(res,404,{error:'Member not found.'});
   }
   const assets=req.url?.match(/^\/api\/organizations\/([0-9a-f-]{36})\/assets$/);
   if(assets&&req.method==='GET'){
    const rows=await listOrganizationAssets(dbQuery,assets[1],user.id);
    return rows===null?json(res,404,{error:'Organization not found.'}):json(res,200,{assets:rows});
   }
   if(assets&&req.method==='POST'){
    const body=await readBody(req);
    const result=await addOrganizationAsset(orgPool||database(),{orgId:assets[1],actorId:user.id,url:body.url});
    return json(res,201,result);
   }
   const orgAssess=req.url?.match(/^\/api\/organizations\/([0-9a-f-]{36})\/assets\/([0-9a-f-]{36})\/assess$/);
   if(orgAssess&&req.method==='POST'){
    if(process.env.LOCAL_SCAN_ENABLED!=='true'||process.env.NODE_ENV==='production')return json(res,403,{error:'Organization assessments are disabled outside approved local testing.'});
    const result=await assessOrganizationAsset(orgPool||database(),{orgId:orgAssess[1],assetId:orgAssess[2],userId:user.id,runAssessment});
    return result?json(res,201,{assessment:result}):json(res,404,{error:'Organization not found.'});
   }
   const orgRemediation=req.url?.match(/^\/api\/organizations\/([0-9a-f-]{36})\/remediations\/([0-9a-f-]{36})$/);
   if(orgRemediation&&req.method==='POST'){
    const body=await readBody(req);
    const result=await updateRemediation(dbQuery,{orgId:orgRemediation[1],remediationId:orgRemediation[2],userId:user.id,status:body.status});
    return result?json(res,200,{remediation:result}):json(res,404,{error:'Remediation not found.'});
   }
   if(schedules&&req.method==='POST'){
    const body=await readBody(req);
    const schedule=await configureReassessment(dbQuery,{orgId:schedules[1],assetId:body.assetId,userId:user.id,intervalHours:body.intervalHours,enabled:body.enabled===true});
    return schedule?json(res,200,{schedule}):json(res,404,{error:'Asset unavailable or DNS proof expired.'});
   }
   const evidence=req.url?.match(/^\/api\/organizations\/([0-9a-f-]{36})\/remediations\/([0-9a-f-]{36})\/evidence$/);
   if(evidence&&req.method==='GET'){
    const rows=await listRemediationEvidence(dbQuery,{orgId:evidence[1],remediationId:evidence[2],userId:user.id});
    return rows?json(res,200,{evidence:rows}):json(res,404,{error:'Organization not found.'});
   }
   if(evidence&&req.method==='POST'){
    const body=await readBody(req);
    const result=await addRemediationEvidence(dbQuery,{orgId:evidence[1],remediationId:evidence[2],userId:user.id,note:body.note});
    return result?json(res,201,{evidence:result}):json(res,404,{error:'Remediation not found.'});
   }
   const orgVerify=req.url?.match(/^\/api\/organizations\/([0-9a-f-]{36})\/assets\/([0-9a-f-]{36})\/verify$/);
   if(orgVerify&&req.method==='POST'){
    const body=await readBody(req);
    const verified=await verifyOrganizationAsset(dbQuery,{orgId:orgVerify[1],assetId:orgVerify[2],userId:user.id,token:body.token,checkOwnership});
    return verified?json(res,200,{asset:verified}):json(res,404,{error:'Asset not found.'});
   }
   const orgRenew=req.url?.match(/^\/api\/organizations\/([0-9a-f-]{36})\/assets\/([0-9a-f-]{36})\/renew$/);
   if(orgRenew&&req.method==='POST'){
    const renewed=await renewOrganizationAsset(dbQuery,{orgId:orgRenew[1],assetId:orgRenew[2],userId:user.id});
    return renewed?json(res,200,renewed):json(res,404,{error:'Asset not found.'});
   }
   const audit=req.url?.match(/^\/api\/organizations\/([0-9a-f-]{36})\/audit$/);
   if(audit&&req.method==='GET'){
    const rows=await organizationAudit(dbQuery,audit[1],user.id);
    return rows===null?json(res,404,{error:'Organization not found.'}):json(res,200,{events:rows});
   }
  }
  if(req.url==='/api/domains'&&req.method==='GET'){
   const result=await dbQuery('SELECT id,hostname,verified_at,created_at FROM domains WHERE user_id=$1 ORDER BY created_at DESC',[user.id]);
   return json(res,200,{domains:result.rows});
  }
  if(req.url==='/api/domains'&&req.method==='POST'){
   const body=await readBody(req);const hostname=canonicalHostname(body.url);
   const token=randomBytes(24).toString('hex');
   const result=await dbQuery('INSERT INTO domains(user_id,hostname,challenge_hash) VALUES($1,$2,$3) RETURNING id,hostname',[user.id,hostname,hashChallenge(token)]);
   return json(res,201,{domain:result.rows[0],dnsRecord:{name:'_openshield-challenge.'+hostname,type:'TXT',value:'openshield-verification='+token}});
  }
  const verify=req.url?.match(/^\/api\/domains\/([0-9a-f-]{36})\/verify$/);
  if(verify&&req.method==='POST'){
   const body=await readBody(req);
   if(typeof body.token!=='string'||body.token.length!==48||!/^[a-f0-9]+$/.test(body.token))throw Error('Verification token required.');
   const result=await dbQuery('SELECT id,hostname,challenge_hash FROM domains WHERE id=$1 AND user_id=$2',[verify[1],user.id]);
   const domain=result.rows[0];if(!domain)return json(res,404,{error:'Domain not found.'});
   if(hashChallenge(body.token)!==domain.challenge_hash)return json(res,403,{error:'Verification token mismatch.'});
   if(!await checkOwnership(domain.hostname,body.token))return json(res,422,{error:'DNS TXT proof not found.'});
   await dbQuery('UPDATE domains SET verified_at=now() WHERE id=$1 AND user_id=$2',[domain.id,user.id]);
   return json(res,200,{verified:true,hostname:domain.hostname});
  }
  const renew=req.url?.match(/^\/api\/domains\/([0-9a-f-]{36})\/renew$/);
  if(renew&&req.method==='POST'){
   const token=randomBytes(24).toString('hex');
   const result=await dbQuery('UPDATE domains SET challenge_hash=$1,verified_at=NULL WHERE id=$2 AND user_id=$3 RETURNING id,hostname',[hashChallenge(token),renew[1],user.id]);
   if(!result.rows.length)return json(res,404,{error:'Domain not found.'});
   const domain=result.rows[0];
   return json(res,200,{domain,dnsRecord:{name:'_openshield-challenge.'+domain.hostname,type:'TXT',value:'openshield-verification='+token}});
  }
  if(req.url==='/api/assess'&&req.method==='POST'){
   const body=await readBody(req);
   const target=validateTarget(body.url,[new URL(body.url).hostname.toLowerCase()]);
   const found=await dbQuery("SELECT id FROM domains WHERE user_id=$1 AND hostname=$2 AND verified_at > now() - interval '30 days'",[user.id,target.hostname]);
   if(!found.rows.length)return json(res,403,{error:'Domain ownership verification is missing or older than 30 days. Renew the DNS challenge before assessing.'});
   const report=await runAssessment(target.hostname);
   const stored=await dbQuery('INSERT INTO assessments(user_id,domain_id,score,findings) VALUES($1,$2,$3,$4::jsonb) RETURNING id,created_at',[user.id,found.rows[0].id,report.score,JSON.stringify(report)]);
   return json(res,200,{...report,id:stored.rows[0].id});
  }
  if(req.url==='/api/assessments'&&req.method==='GET'){
   const result=await dbQuery('SELECT a.id,d.hostname,a.score,a.created_at FROM assessments a JOIN domains d ON d.id=a.domain_id WHERE a.user_id=$1 ORDER BY a.created_at DESC LIMIT 50',[user.id]);
   return json(res,200,{assessments:result.rows});
  }
  const reportPath=req.url?.match(/^\/api\/assessments\/([0-9a-f-]{36})$/);
  if(reportPath&&req.method==='GET'){
   const result=await dbQuery('SELECT findings FROM assessments WHERE id=$1 AND user_id=$2',[reportPath[1],user.id]);
   if(!result.rows.length)return json(res,404,{error:'Assessment not found.'});
   return json(res,200,result.rows[0].findings);
  }
  return json(res,404,{error:'Not found'});
 }catch(error){
  const conflict=error.code==='23505';
  const infrastructure=!!error.code&&!conflict;
  return json(res,conflict?409:infrastructure?503:400,{error:conflict?'Account or domain already exists.':infrastructure?'Database temporarily unavailable.':error.message});
 }
});
}
export const server=createApp();
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 validateDeployment();
 server.listen(PORT,HOST,()=>console.log(`OpenShield local API at http://${HOST}:${PORT}`));
}
