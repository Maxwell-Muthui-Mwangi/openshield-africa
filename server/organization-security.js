import {newToken,sessionHash} from './auth.js';
import {canonicalHostname,hashChallenge} from './ownership.js';
import {randomBytes} from 'node:crypto';
const uuid=/^[0-9a-f-]{36}$/;
const roles=['owner','admin','analyst','viewer'];
export function validInviteEmail(email){return typeof email==='string'&&email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
export async function organizationRole(query,orgId,userId){
 const r=await query('SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2',[orgId,userId]);
 return r.rows[0]?.role||null;
}
export async function organizationAudit(query,orgId,userId,limit=50){
 if(!await organizationRole(query,orgId,userId))return null;
 const r=await query('SELECT id,actor_user_id,action,target_user_id,created_at FROM organization_audit_events WHERE organization_id=$1 ORDER BY id DESC LIMIT $2',[orgId,Math.min(100,Math.max(1,limit))]);
 return r.rows;
}
export async function inviteMember(pool,{orgId,actorId,email,role}){
 email=String(email||'').trim().toLowerCase();
 if(!validInviteEmail(email)||!['admin','analyst','viewer'].includes(role))throw Error('Invalid invitation.');
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const actor=await client.query('SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2 FOR UPDATE',[orgId,actorId]);
  if(!['owner','admin'].includes(actor.rows[0]?.role)||actor.rows[0].role==='admin'&&role==='admin')throw Error('Insufficient organization permissions.');
  const token=newToken();
  const r=await client.query(`INSERT INTO organization_invitations
   (organization_id,email,role,token_hash,invited_by,expires_at)
   VALUES($1,$2,$3,$4,$5,now()+interval '48 hours') RETURNING id,expires_at`,
   [orgId,email,role,sessionHash(token),actorId]);
  await client.query(`INSERT INTO organization_audit_events(organization_id,actor_user_id,action)
   VALUES($1,$2,'invitation.created')`,[orgId,actorId]);
  await client.query('COMMIT');
  // This token is returned only to the authenticated inviter; delivery is a separate
  // administrator-controlled workflow until an encrypted invitation mailer is integrated.
  return {id:r.rows[0].id,expiresAt:r.rows[0].expires_at,token};
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}
export async function acceptInvitation(pool,{token,userId,email}){
 if(typeof token!=='string'||token.length>256||!token)throw Error('Invalid invitation token.');
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const r=await client.query(`SELECT * FROM organization_invitations
   WHERE token_hash=$1 AND accepted_at IS NULL AND revoked_at IS NULL
   AND expires_at>now() FOR UPDATE`,[sessionHash(token)]);
  const invite=r.rows[0];
  if(!invite||invite.email!==email.toLowerCase()){await client.query('ROLLBACK');return false}
  await client.query(`INSERT INTO organization_members(organization_id,user_id,role)
   VALUES($1,$2,$3) ON CONFLICT(organization_id,user_id) DO NOTHING`,
   [invite.organization_id,userId,invite.role]);
  await client.query('UPDATE organization_invitations SET accepted_at=now() WHERE id=$1',[invite.id]);
  await client.query(`INSERT INTO organization_audit_events(organization_id,actor_user_id,action,target_user_id)
   VALUES($1,$2,'invitation.accepted',$2)`,[invite.organization_id,userId]);
  await client.query('COMMIT');return true;
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}
export async function changeMemberRole(pool,{orgId,actorId,targetId,role}){
 if(!['admin','analyst','viewer'].includes(role))throw Error('Invalid role.');
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const actor=await client.query('SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2 FOR UPDATE',[orgId,actorId]);
  if(actor.rows[0]?.role!=='owner')throw Error('Only the owner may change roles.');
  const r=await client.query(`UPDATE organization_members SET role=$3
   WHERE organization_id=$1 AND user_id=$2 AND role<>'owner' RETURNING user_id`,[orgId,targetId,role]);
  if(!r.rowCount){await client.query('ROLLBACK');return false}
  await client.query(`INSERT INTO organization_audit_events(organization_id,actor_user_id,action,target_user_id)
   VALUES($1,$2,'member.role_changed',$3)`,[orgId,actorId,targetId]);
  await client.query('COMMIT');return true;
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}
export async function addOrganizationAsset(pool,{orgId,actorId,url}){
 const hostname=canonicalHostname(url),token=randomBytes(24).toString('hex');
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const member=await client.query('SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2',[orgId,actorId]);
  if(!['owner','admin','analyst'].includes(member.rows[0]?.role))throw Error('Insufficient organization permissions.');
  const r=await client.query(`INSERT INTO organization_assets(organization_id,hostname,added_by,challenge_hash)
   VALUES($1,$2,$3,$4) RETURNING id,hostname`,[orgId,hostname,actorId,hashChallenge(token)]);
  await client.query(`INSERT INTO organization_audit_events(organization_id,actor_user_id,action)
   VALUES($1,$2,'asset.created')`,[orgId,actorId]);
  await client.query('COMMIT');
  return {asset:r.rows[0],dnsRecord:{name:'_openshield-challenge.'+hostname,type:'TXT',value:'openshield-verification='+token}};
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}
export async function listOrganizationAssets(query,orgId,userId){
 if(!await organizationRole(query,orgId,userId))return null;
 const r=await query('SELECT id,hostname,verified_at,created_at FROM organization_assets WHERE organization_id=$1 ORDER BY created_at DESC',[orgId]);
 return r.rows;
}
