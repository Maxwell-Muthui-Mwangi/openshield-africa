import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const url=process.env.INTEGRATION_DATABASE_URL;
if(!url||!new URL(url).pathname.endsWith('_test'))throw Error('Dedicated _test database required.');
process.env.DATABASE_URL=url;process.env.DB_MODE='self-hosted';
const {database,query}=await import('../../server/database.js');
const {createOrganization}=await import('../../server/organizations.js');
const {addOrganizationAsset}=await import('../../server/organization-security.js');
const {assessOrganizationAsset,organizationReport,updateRemediation}=await import('../../server/organization-assessments.js');

test('organization assessments require proof and tenant membership, then create scoped remediation', {timeout:30000},async()=>{
 const suffix=randomUUID().slice(0,8);
 const a=(await query("INSERT INTO users(email,password_hash) VALUES($1,'test') RETURNING id",['assess-owner-'+suffix+'@example.org'])).rows[0];
 const b=(await query("INSERT INTO users(email,password_hash) VALUES($1,'test') RETURNING id",['assess-other-'+suffix+'@example.org'])).rows[0];
 let invoked=0;
 const runAssessment=async hostname=>{invoked++;return {url:'https://'+hostname,score:80,checks:[{id:'hsts',name:'HSTS',severity:'medium',status:'warning',recommendation:'Enable HSTS.'}]}};
 try{
  const org=await createOrganization({name:'Assessment Team',slug:'assess-'+suffix,userId:a.id},database());
  const asset=await addOrganizationAsset(database(),{orgId:org.id,actorId:a.id,url:'https://example.org'});
  const args={orgId:org.id,assetId:asset.asset.id,runAssessment};
  assert.equal(await assessOrganizationAsset(database(),{...args,userId:b.id}),null);
  await assert.rejects(()=>assessOrganizationAsset(database(),{...args,userId:a.id}),/proof/);
  assert.equal(invoked,0);
  await query("UPDATE organization_assets SET verified_at=now() WHERE id=$1",[asset.asset.id]);
  const assessment=await assessOrganizationAsset(database(),{...args,userId:a.id});
  assert.equal(invoked,1);assert.equal(assessment.score,80);
  assert.equal(await organizationReport(query,{orgId:org.id,userId:b.id}),null);
  const report=await organizationReport(query,{orgId:org.id,userId:a.id});
  assert.equal(report.assessments.length,1);assert.equal(report.remediations.length,1);
  assert.equal(report.remediations[0].severity,'medium');
  assert.equal(await updateRemediation(query,{orgId:org.id,userId:b.id,remediationId:report.remediations[0].id,status:'resolved'}),null);
  const updated=await updateRemediation(query,{orgId:org.id,userId:a.id,remediationId:report.remediations[0].id,status:'in_progress'});
  assert.equal(updated.status,'in_progress');
 }finally{
  await query('DELETE FROM organizations WHERE created_by=$1',[a.id]);
  await query('DELETE FROM users WHERE id IN ($1,$2)',[a.id,b.id]);
 }
});
