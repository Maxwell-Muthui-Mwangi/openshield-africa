import test from 'node:test';
import assert from 'node:assert/strict';

const base=process.env.NETLIFY_PREVIEW_URL;
test('Netlify preview is static and never exposes a live scanner',{skip:!base},async()=>{
 const origin=new URL(base);
 assert.equal(origin.protocol,'https:');
 assert.equal(origin.hostname,'openshieldkenya.netlify.app');
 const home=await fetch(origin,{signal:AbortSignal.timeout(12000)});
 assert.equal(home.status,200,'Expected deployed frontend HTML');
 const html=await home.text();
 assert.match(html,/<!doctype html|<html/i);
 const api=await fetch(new URL('/api/domains',origin),{redirect:'manual',signal:AbortSignal.timeout(12000)});
 assert.equal(api.status,503,'Static preview must not expose a live API');
 const payload=await api.json();
 assert.equal(payload.code,'API_NOT_DEPLOYED');
});
