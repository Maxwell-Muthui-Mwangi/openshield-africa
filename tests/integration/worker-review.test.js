import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const url=process.env.INTEGRATION_DATABASE_URL;
if(!url||!new URL(url).pathname.endsWith('_test'))throw Error('Dedicated _test database required.');
process.env.DATABASE_URL=url;process.env.DB_MODE='self-hosted';
const {database,query}=await import('../../server/database.js');
const {createOrganization}=await import('../../server/organizations.js');
const {addOrganizationAsset}=await import('../../server/organization-security.js');
const {configureReassessment,cancelReassessment}=await import('../../server/reassessment-scheduler.js');
const {addRemediationEvidence,reviewRemediationEvidence,listRemediationEvidence}=await import('../../server/remediation-evidence.js');
test('schedule cancellation and independent evidence review enforce organization roles',{timeout:30000},async()=>{
 const suffix=randomUUID().slice(0,8);
 const a=(await query("INSERT INTO users(email,password_hash) VALUES($1,'test') RETURNING id",['review-owner-'+suffix+'@example.org'])).rows[0];
 const b=(await query("INSERT INTO users(email,password_hash) VALUES($1,'test') RETURNING id",['review-analyst-'+suffix+'@example.org'])).rows[0];
 try{
  const org=await createOrganization({name:'Review Team',slug:'review-'+suffix,userId:a.id},database());
  await query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'analyst')",[org.id,b.id]);
  const asset=await addOrganizationAsset(database(),{orgId:org.id,actorId:a.id,url:'https://example.org'});
  await query('UPDATE organization_assets SET verified_at=now() WHERE id=$1',[asset.asset.id]);
  await configureReassessment(query,{orgId:org.id,assetId:asset.asset.id,userId:a.id,intervalHours:168,enabled:true});
  assert.equal(await cancelReassessment(query,{orgId:org.id,assetId:asset.asset.id,userId:b.id}),null);
  assert.equal((await cancelReassessment(query,{orgId:org.id,assetId:asset.asset.id,userId:a.id})).enabled,false);
  const assessment=(await query("INSERT INTO organization_assessments(organization_id,asset_id,initiated_by,score,snapshot) VALUES($1,$2,$3,80,'{}') RETURNING id",[org.id,asset.asset.id,a.id])).rows[0];
  const remediation=(await query("INSERT INTO organization_remediations(organization_id,assessment_id,finding_key,severity) VALUES($1,$2,'hsts','medium') RETURNING id",[org.id,assessment.id])).rows[0];
  const evidence=await addRemediationEvidence(query,{orgId:org.id,remediationId:remediation.id,userId:b.id,note:'HSTS configured on edge'});
  assert.equal(await reviewRemediationEvidence(query,{orgId:org.id,evidenceId:evidence.id,userId:b.id,status:'accepted'}),null);
  assert.equal((await reviewRemediationEvidence(query,{orgId:org.id,evidenceId:evidence.id,userId:a.id,status:'accepted'})).review_status,'accepted');
  assert.equal((await listRemediationEvidence(query,{orgId:org.id,remediationId:remediation.id,userId:b.id}))[0].review_status,'accepted');
 }finally{
  await query('DELETE FROM organizations WHERE created_by=$1',[a.id]);
  await query('DELETE FROM users WHERE id IN ($1,$2)',[a.id,b.id]);
 }
});
