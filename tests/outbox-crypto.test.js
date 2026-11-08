import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {encryptMessage,decryptMessage,encryptionKey} from '../server/outbox-crypto.js';
test('encrypted outbox roundtrip and tamper detection',()=>{
 const key=randomBytes(32),message={to:'a@example.org',subject:'verify',text:'token=secret'};
 const enc=encryptMessage(message,key);
 assert.equal(enc.payload.includes(Buffer.from('secret')),false);
 assert.deepEqual(decryptMessage({...enc,auth_tag:enc.authTag},key),message);
 assert.throws(()=>decryptMessage({...enc,auth_tag:randomBytes(16)},key));
});
test('rejects missing or malformed encryption keys',()=>{
 assert.throws(()=>encryptionKey({}));
 assert.throws(()=>encryptionKey({OUTBOX_ENCRYPTION_KEY:'short'}));
});
