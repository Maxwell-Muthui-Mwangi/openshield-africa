import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const url=process.env.INTEGRATION_DATABASE_URL;
if(!url||!new URL(url).pathname.endsWith('_test'))throw Error('Dedicated _test PostgreSQL database required.');
process.env.DATABASE_URL=url;process.env.DB_MODE='self-hosted';
const {database,query}=await import('../../server/database.js');
const {createOrganization}=await import('../../server/organizations.js');
const {addOrganizationAsset}=await import('../../server/organization-security.js');
const {configureReassessment,cancelReassessment,processReassessmentBatch}=await import('../../server/reassessment-scheduler.js');

test('adversarial: cancellation while worker scans cannot persist findings',{timeout:30000},async()=>{
 const suffix=randomUUID().slice(0,8);
 const owner=(await query("INSERT INTO users(email,password_hash) VALUES($1,'test') RETURNING id",['adversarial-'+suffix+'@example.org'])).rows[0];
 const original={worker:process.env.REASSESSMENT_WORKER_ENABLED,scan:process.env.LOCAL_SCAN_ENABLED,node:process.env.NODE_ENV};
 let entered;const started=new Promise(resolve=>{entered=resolve});
 let resume;const blocked=new Promise(resolve=>{resume=resolve});
 try{
  const org=await createOrganization({name:'Adversarial Team',slug:'adversarial-'+suffix,userId:owner.id},database());
  const asset=await addOrganizationAsset(database(),{orgId:org.id,actorId:owner.id,url:'https://example.org'});
  await query('UPDATE organization_assets SET verified_at=now() WHERE id=$1',[asset.asset.id]);
  await configureReassessment(query,{orgId:org.id,assetId:asset.asset.id,userId:owner.id,intervalHours:24,enabled:true});
  await query("UPDATE organization_reassessment_schedules SET next_run_at=now()-interval '1 minute' WHERE organization_id=$1",[org.id]);
  process.env.REASSESSMENT_WORKER_ENABLED='true';process.env.LOCAL_SCAN_ENABLED='true';process.env.NODE_ENV='test';
  const worker=processReassessmentBatch(database(),{runAssessment:async()=>{entered();await blocked;return {score:90,checks:[]}}});
  await started;
  const cancelled=await cancelReassessment(query,{orgId:org.id,assetId:asset.asset.id,userId:owner.id});
  assert.equal(cancelled.enabled,false);
  resume();
  const result=await worker;
  assert.equal(result[0].acknowledged,false);
  const stored=await query('SELECT count(*)::int AS n FROM organization_assessments WHERE organization_id=$1',[org.id]);
  assert.equal(stored.rows[0].n,0);
 }finally{
  if(resume)resume();
  for(const [k,v] of Object.entries(original)){const key=k==='worker'?'REASSESSMENT_WORKER_ENABLED':k==='scan'?'LOCAL_SCAN_ENABLED':'NODE_ENV';if(v===undefined)delete process.env[key];else process.env[key]=v}
  await query('DELETE FROM organizations WHERE created_by=$1',[owner.id]);
  await query('DELETE FROM users WHERE id=$1',[owner.id]);
 }
});
