import {randomBytes,timingSafeEqual} from 'node:crypto';
import {hashChallenge,checkDnsOwnership} from './ownership.js';
import {organizationRole} from './organization-security.js';

export async function verifyOrganizationAsset(query,{orgId,assetId,userId,token,checkOwnership=checkDnsOwnership}){
 if(typeof token!=='string'||!/^[a-f0-9]{48}$/.test(token))throw Error('Valid DNS challenge required.');
 const role=await organizationRole(query,orgId,userId);
 if(!['owner','admin','analyst'].includes(role))return null;
 const r=await query('SELECT id,hostname,challenge_hash FROM organization_assets WHERE id=$1 AND organization_id=$2',[assetId,orgId]);
 const asset=r.rows[0];if(!asset)return null;
 const expected=Buffer.from(asset.challenge_hash,'hex'),provided=Buffer.from(hashChallenge(token),'hex');
 if(expected.length!==provided.length||!timingSafeEqual(expected,provided))throw Error('DNS challenge mismatch.');
 if(!await checkOwnership(asset.hostname,token))throw Error('DNS TXT proof not found.');
 const result=await query('UPDATE organization_assets SET verified_at=now() WHERE id=$1 AND organization_id=$2 AND challenge_hash=$3 RETURNING id,hostname,verified_at',[assetId,orgId,asset.challenge_hash]);
 await query("INSERT INTO organization_audit_events(organization_id,actor_user_id,action) VALUES($1,$2,'asset.verified')",[orgId,userId]);
 return result.rows[0]||null;
}
export async function renewOrganizationAsset(query,{orgId,assetId,userId}){
 const role=await organizationRole(query,orgId,userId);
 if(!['owner','admin','analyst'].includes(role))return null;
 const token=randomBytes(24).toString('hex');
 const r=await query('UPDATE organization_assets SET challenge_hash=$1,verified_at=NULL WHERE id=$2 AND organization_id=$3 RETURNING id,hostname',[hashChallenge(token),assetId,orgId]);
 if(!r.rows.length)return null;
 await query("INSERT INTO organization_audit_events(organization_id,actor_user_id,action) VALUES($1,$2,'asset.renewed')",[orgId,userId]);
 return {asset:r.rows[0],dnsRecord:{name:'_openshield-challenge.'+r.rows[0].hostname,type:'TXT',value:'openshield-verification='+token}};
}
export async function organizationDashboard(query,{orgId,userId}){
 const role=await organizationRole(query,orgId,userId);
 if(!role)return null;
 const [assets,members,events]=await Promise.all([
  query(`SELECT count(*)::int AS total,
   count(*) FILTER(WHERE verified_at>now()-interval '30 days')::int AS verified,
   count(*) FILTER(WHERE verified_at IS NULL OR verified_at<=now()-interval '30 days')::int AS needs_verification
   FROM organization_assets WHERE organization_id=$1`,[orgId]),
  query('SELECT count(*)::int AS total FROM organization_members WHERE organization_id=$1',[orgId]),
  query(`SELECT action,created_at FROM organization_audit_events WHERE organization_id=$1 ORDER BY id DESC LIMIT 10`,[orgId])
 ]);
 return {organizationId:orgId,role,assets:assets.rows[0],members:members.rows[0].total,recentActivity:events.rows,
  securityScore:null,assessments:0,disclaimer:'No organization assessments have been run. Security score is unavailable.'};
}
