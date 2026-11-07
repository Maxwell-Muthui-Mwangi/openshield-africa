import test from 'node:test';
import assert from 'node:assert/strict';
import {databaseConfig} from '../server/db-config.js';
const url='postgresql://user:pass@db.example.org:5432/openshield';
test('self-hosted profile permits local connection',()=>{
 const {mode,config}=databaseConfig({DB_MODE:'self-hosted',DATABASE_URL:'postgresql://user:pass@127.0.0.1:5432/openshield'});
 assert.equal(mode,'self-hosted');assert.equal(config.ssl,undefined);
});
test('managed profile enforces certificate-verified TLS',()=>{
 const {mode,config}=databaseConfig({DB_MODE:'managed',DATABASE_URL:url});
 assert.equal(mode,'managed');assert.equal(config.ssl.rejectUnauthorized,true);
});
test('managed profile rejects disabled TLS',()=>{
 assert.throws(()=>databaseConfig({DB_MODE:'managed',DATABASE_URL:url,DATABASE_SSL:'disable'}));
});
test('rejects invalid connection configuration',()=>{
 assert.throws(()=>databaseConfig({DATABASE_URL:'https://example.org'}));
 assert.throws(()=>databaseConfig({DATABASE_URL:url,DB_MODE:'dual'}));
 assert.throws(()=>databaseConfig({DATABASE_URL:url,DB_POOL_MAX:'100'}));
});
