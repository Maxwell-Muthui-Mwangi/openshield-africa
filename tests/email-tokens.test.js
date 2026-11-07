import test from 'node:test';
import assert from 'node:assert/strict';
import {authLink,consumeEmailToken} from '../server/email-tokens.js';
test('auth links contain token only as query value',()=>{
 const url=new URL(authLink('http://localhost:5173','/verify-email','secret'));
 assert.equal(url.searchParams.get('token'),'secret');
 assert.equal(url.pathname,'/verify-email');
});
test('malformed email tokens never query database',async()=>{
 assert.equal(await consumeEmailToken(()=>{throw Error('must not query')},'short','verify'),null);
});
