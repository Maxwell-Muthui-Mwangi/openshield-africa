import test from 'node:test';
import assert from 'node:assert/strict';
import {stagingPreflight} from '../scripts/staging-preflight.js';
const safe={NODE_ENV:'staging',APP_ORIGIN:'https://staging.example.invalid',COOKIE_SECURE:'true',REGISTRATION_ENABLED:'false',PUBLIC_SCAN_ENABLED:'false',LOCAL_SCAN_ENABLED:'false',REASSESSMENT_WORKER_ENABLED:'false',OUTBOX_WORKER_ENABLED:'false',STAGING_VERIFY_ENABLED:'true',DATABASE_URL:'postgres://example.invalid/db',SMTP_HOST:'smtp.example.invalid',MAIL_FROM:'staging@example.invalid'};
test('private staging preflight blocks missing credentials and unsafe toggles',()=>{
 assert.equal(stagingPreflight(safe).safe,true);
 for(const key of ['DATABASE_URL','SMTP_HOST','MAIL_FROM','APP_ORIGIN']){
  const altered={...safe,[key]:''};assert.equal(stagingPreflight(altered).safe,false);
 }
 for(const key of ['PUBLIC_SCAN_ENABLED','REGISTRATION_ENABLED','LOCAL_SCAN_ENABLED','OUTBOX_WORKER_ENABLED','REASSESSMENT_WORKER_ENABLED']){
  assert.equal(stagingPreflight({...safe,[key]:'true'}).safe,false);
 }
 assert.equal(stagingPreflight({...safe,COOKIE_SECURE:'false'}).safe,false);
});
