import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const url=process.env.INTEGRATION_DATABASE_URL;
if(!url||!new URL(url).pathname.endsWith('_test'))throw Error('Isolated _test PostgreSQL database required.');
process.env.DATABASE_URL=url;process.env.DB_MODE='self-hosted';
const {database,query}=await import('../../server/database.js');
const {createOrganization}=await import('../../server/organizations.js');
const {inviteMember,acceptInvitation,changeMemberRole,addOrganizationAsset,listOrganizationAssets,organizationAudit}=await import('../../server/organization-security.js');

test('organization invitation and asset boundaries', {timeout:30000},async()=>{
 const suffix=randomUUID().slice(0,8);
 const ownerEmail='org-owner-'+suffix+'@example.org',guestEmail='org-guest-'+suffix+'@example.org';
 const a=(await query("INSERT INTO users(email,password_hash) VALUES($1,'test') RETURNING id",[ownerEmail])).rows[0];
 const b=(await query("INSERT INTO users(email,password_hash) VALUES($1,'test') RETURNING id",[guestEmail])).rows[0];
 try{
  const org=await createOrganization({name:'Security Team',slug:'secure-'+suffix,userId:a.id},database());
  assert.equal(await listOrganizationAssets(query,org.id,b.id),null);
  await assert.rejects(()=>inviteMember(database(),{orgId:org.id,actorId:b.id,email:guestEmail,role:'admin'}));
  const invite=await inviteMember(database(),{orgId:org.id,actorId:a.id,email:guestEmail,role:'analyst'});
  assert.equal(await acceptInvitation(database(),{token:invite.token,userId:b.id,email:ownerEmail}),false);
  assert.equal(await acceptInvitation(database(),{token:invite.token,userId:b.id,email:guestEmail}),true);
  assert.equal(await acceptInvitation(database(),{token:invite.token,userId:b.id,email:guestEmail}),false);
  await assert.rejects(()=>changeMemberRole(database(),{orgId:org.id,actorId:b.id,targetId:a.id,role:'admin'}));
  assert.equal(await changeMemberRole(database(),{orgId:org.id,actorId:a.id,targetId:b.id,role:'viewer'}),true);
  await assert.rejects(()=>addOrganizationAsset(database(),{orgId:org.id,actorId:b.id,url:'https://example.org'}));
  const added=await addOrganizationAsset(database(),{orgId:org.id,actorId:a.id,url:'https://example.org'});
  assert.equal(added.asset.hostname,'example.org');
  assert.equal((await listOrganizationAssets(query,org.id,b.id)).length,1);
  assert.ok((await organizationAudit(query,org.id,a.id)).length>=4);
 }finally{
  await query('DELETE FROM organizations WHERE created_by=$1',[a.id]);
  await query('DELETE FROM users WHERE id IN ($1,$2)',[a.id,b.id]);
 }
});
