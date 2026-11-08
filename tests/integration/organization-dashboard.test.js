import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const url=process.env.INTEGRATION_DATABASE_URL;
if(!url||!new URL(url).pathname.endsWith('_test'))throw Error('Isolated _test PostgreSQL database required.');
process.env.DATABASE_URL=url;process.env.DB_MODE='self-hosted';
const {database,query}=await import('../../server/database.js');
const {createOrganization}=await import('../../server/organizations.js');
const {addOrganizationAsset}=await import('../../server/organization-security.js');
const {organizationDashboard,verifyOrganizationAsset,renewOrganizationAsset}=await import('../../server/organization-dashboard.js');
test('tenant dashboard, DNS proof and renewal enforce membership', {timeout:30000},async()=>{
 const suffix=randomUUID().slice(0,8);
 const a=(await query("INSERT INTO users(email,password_hash) VALUES($1,'test') RETURNING id",['dns-owner-'+suffix+'@example.org'])).rows[0];
 const b=(await query("INSERT INTO users(email,password_hash) VALUES($1,'test') RETURNING id",['dns-outsider-'+suffix+'@example.org'])).rows[0];
 try{
  const org=await createOrganization({name:'DNS Team',slug:'dns-'+suffix,userId:a.id},database());
  const added=await addOrganizationAsset(database(),{orgId:org.id,actorId:a.id,url:'https://example.org'});
  assert.equal(await organizationDashboard(query,{orgId:org.id,userId:b.id}),null);
  assert.equal(await verifyOrganizationAsset(query,{orgId:org.id,assetId:added.asset.id,userId:b.id,token:added.dnsRecord.value.split('=')[1],checkOwnership:async()=>true}),null);
  const summary=await organizationDashboard(query,{orgId:org.id,userId:a.id});
  assert.equal(summary.assets.total,1);assert.equal(summary.assets.verified,0);
  const proof=added.dnsRecord.value.split('=')[1];
  await assert.rejects(()=>verifyOrganizationAsset(query,{orgId:org.id,assetId:added.asset.id,userId:a.id,token:'0'.repeat(48),checkOwnership:async()=>true}),/mismatch/);
  const verified=await verifyOrganizationAsset(query,{orgId:org.id,assetId:added.asset.id,userId:a.id,token:proof,checkOwnership:async()=>true});
  assert.equal(verified.hostname,'example.org');
  assert.equal((await organizationDashboard(query,{orgId:org.id,userId:a.id})).assets.verified,1);
  const renewed=await renewOrganizationAsset(query,{orgId:org.id,assetId:added.asset.id,userId:a.id});
  assert.equal(renewed.asset.hostname,'example.org');
  assert.equal((await organizationDashboard(query,{orgId:org.id,userId:a.id})).assets.verified,0);
  assert.equal((await organizationDashboard(query,{orgId:org.id,userId:a.id})).securityScore,null);
 }finally{
  await query('DELETE FROM organizations WHERE created_by=$1',[a.id]);
  await query('DELETE FROM users WHERE id IN ($1,$2)',[a.id,b.id]);
 }
});
