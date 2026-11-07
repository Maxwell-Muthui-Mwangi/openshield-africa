import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate} from '../server/checks.js';

test('empty headers return actionable findings',()=>{
 const report=evaluate(new Headers());
 assert.equal(report.checks.length,5);
 assert.equal(report.score,20);
 assert.equal(report.checks.filter(x=>x.status==='warning').length,4);
 assert.ok(report.checks.every(x=>x.recommendation));
});
test('strong observed transport and headers pass the initial checklist',()=>{
 const headers=new Headers({
  'strict-transport-security':'max-age=31536000',
  'content-security-policy':"default-src 'self'",
  'x-content-type-options':'nosniff',
  'referrer-policy':'strict-origin'
 });
 assert.equal(evaluate(headers).score,100);
});
test('header presence alone does not guarantee a passing score',()=>{
 const headers=new Headers({
  'strict-transport-security':'max-age=0',
  'content-security-policy':"report-uri /collect",
  'x-content-type-options':'yes',
  'referrer-policy':'unsafe-url'
 });
 assert.equal(evaluate(headers).score,20);
});
test('insecure transport fails the transport check',()=>{
 assert.equal(evaluate(new Headers(),false).checks[0].status,'warning');
});
