import test from 'node:test';
import assert from 'node:assert/strict';
import {loginBucketKey} from '../server/login-limit.js';
test('login budget keys are normalized, non-reversible SHA-256 values',()=>{
 const a=loginBucketKey('account','Person@Example.ORG');
 assert.equal(a,loginBucketKey('account','person@example.org'));
 assert.match(a,/^[a-f0-9]{64}$/);
 assert.notEqual(a,loginBucketKey('ip','person@example.org'));
 assert.equal(a.includes('person'),false);
});
test('bad login bucket inputs are rejected',()=>{
 assert.throws(()=>loginBucketKey('other','value'));
 assert.throws(()=>loginBucketKey('account',123));
});
