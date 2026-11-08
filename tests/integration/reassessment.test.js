import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const url=process.env.INTEGRATION_DATABASE_URL;
if(!url||!new URL(url).pathname.endsWith('_test'))throw Error('Isolated _test PostgreSQL database required.');
process.env.DATABASE_URL=url;process.env.DB_MODE='self-hosted';
const {database,query}=await import('../../server/database.js');
const {createOrganization}=await import('../../server/organizations.js');
const {addOrganizationAsset}=await import('../../server/organization-security.js');
const {configureReassessment,listReassessments,processReassessmentBatch}=await import('../../server/reassessment-scheduler.js');
test('reassessment requires owner, DNS proof, explicit worker gate and schedule opt-in',{timeout:30000},async()=>{
 const suffix=randomUUID().slice(0,8);
 const a=(await query("INSERT INTO users(email,password_hash) VALUES($1,'test') RETURNING id",['schedule-owner-'+suffix+'@example.org'])).rows[0];
 const b=(await query("INSERT INTO users(email,password_hash) VALUES($1,'test') RETURNING id",['schedule-outsider-'+suffix+'@example.org'])).rows[0];
 try{
  const org=await createOrganization({name:'Scheduled Team',slug:'schedule-'+suffix,userId:a.id},database());
  const asset=await addOrganizationAsset(database(),{orgId:org.id,actorId:a.id,url:'https://example.org'});
  const args={orgId:org.id,assetId:asset.asset.id,intervalHours:168,enabled:false};
  assert.equal(await configureReassessment(query,{...args,userId:b.id}),null);
  assert.equal(await configureReassessment(query,{...args,userId:a.id}),null);
  await query('UPDATE organization_assets SET verified_at=now() WHERE id=$1',[asset.asset.id]);
  const schedule=await configureReassessment(query,{...args,userId:a.id});
  assert.equal(schedule.enabled,false);
  assert.equal((await listReassessments(query,{orgId:org.id,userId:a.id})).length,1);
  assert.equal(await listReassessments(query,{orgId:org.id,userId:b.id}),null);
  await assert.rejects(()=>processReassessmentBatch(database(),{runAssessment:async()=>{throw Error('Must not scan')}}),/restricted/);
 }finally{
  await query('DELETE FROM organizations WHERE created_by=$1',[a.id]);
  await query('DELETE FROM users WHERE id IN ($1,$2)',[a.id,b.id]);
 }
});
