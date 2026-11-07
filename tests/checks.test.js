import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate} from '../server/checks.js';
test('empty headers provide recommendations',()=>{const result=evaluate(new Headers());assert.equal(result.checks.length,5);assert.equal(result.score,20)});
test('all observed controls yield score 100',()=>{const headers=new Headers({'strict-transport-security':'max-age=31536000','content-security-policy':"default-src 'self'",'x-content-type-options':'nosniff','referrer-policy':'strict-origin'});assert.equal(evaluate(headers).score,100)});
