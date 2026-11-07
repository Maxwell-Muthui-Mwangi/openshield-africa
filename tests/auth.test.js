import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,verifyPassword,newToken,sessionHash,readSessionCookie,sessionCookie} from '../server/auth.js';
import {canonicalHostname,checkDnsOwnership,hashChallenge} from '../server/ownership.js';
test('password hashing verifies correct password and rejects incorrect',async()=>{
 const h=await hashPassword('a strong example password 123');
 assert.equal(await verifyPassword('a strong example password 123',h),true);
 assert.equal(await verifyPassword('incorrect password',h),false);
});
test('short passwords are rejected',async()=>assert.rejects(()=>hashPassword('short')));
test('session tokens are random and hashed before storage',()=>{
 const a=newToken(),b=newToken();assert.notEqual(a,b);assert.notEqual(sessionHash(a),a);
 assert.equal(readSessionCookie(sessionCookie(a)),a);
});
test('DNS ownership proof requires exact token',async()=>{
 const resolver={resolveTxt:async()=>[['other'],['openshield-verification=secret']]};
 assert.equal(await checkDnsOwnership('example.org','secret',resolver),true);
 assert.equal(await checkDnsOwnership('example.org','wrong',resolver),false);
 assert.notEqual(hashChallenge('secret'),'secret');
});
test('domain canonicalization rejects path and unsafe schemes',()=>{
 assert.equal(canonicalHostname('https://example.org/'),'example.org');
 assert.throws(()=>canonicalHostname('http://example.org/'));
 assert.throws(()=>canonicalHostname('https://example.org/private'));
});
