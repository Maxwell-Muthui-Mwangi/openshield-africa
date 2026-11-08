import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateReleaseGate,safeStagingEnvironment} from '../server/release-gate.js';
const keys=['ci','postgres','stagingDatabase','stagingSmtp','delivery','restore','egress','independentReview','reviewFindingsClosed','ownerApproval'];
test('release gate fails closed with absent or partial evidence',()=>{
 assert.equal(evaluateReleaseGate({}).approved,false);
 for(const key of keys){
  const all=Object.fromEntries(keys.map(k=>[k,true]));all[key]=false;
  const result=evaluateReleaseGate(all);
  assert.equal(result.approved,false);assert.ok(result.missing.includes(key));
 }
 assert.equal(evaluateReleaseGate(Object.fromEntries(keys.map(k=>[k,true]))).approved,true);
});
test('staging preflight blocks public features and workers',()=>{
 assert.equal(safeStagingEnvironment({NODE_ENV:'development',REGISTRATION_ENABLED:'false',PUBLIC_SCAN_ENABLED:'false',APP_ORIGIN:'https://staging.example.org'}).safe,true);
 for(const flag of ['REGISTRATION_ENABLED','PUBLIC_SCAN_ENABLED','REASSESSMENT_WORKER_ENABLED','OUTBOX_WORKER_ENABLED'])
  assert.equal(safeStagingEnvironment({[flag]:'true'}).safe,false);
 assert.equal(safeStagingEnvironment({NODE_ENV:'production'}).safe,false);
 assert.equal(safeStagingEnvironment({APP_ORIGIN:'http://example.org'}).safe,false);
});
