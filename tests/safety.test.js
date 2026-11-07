import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTarget,isPublicIPv4,limitWindow} from '../server/safety.js';

test('permits an allowlisted HTTPS root', () => {
 assert.equal(validateTarget('https://example.com/', ['example.com']).hostname,'example.com');
});
test('rejects credentials, ports, paths, queries and other protocols', () => {
 for(const candidate of ['http://example.com','https://example.com:8443','https://user:pass@example.com',
 'https://example.com/private','https://example.com/?token=a','https://127.0.0.1/']){
 assert.throws(()=>validateTarget(candidate,['example.com']));
 }
});
test('does not accept unapproved hosts', () => {
 assert.throws(()=>validateTarget('https://another.example',['example.com']));
});
test('blocks private, metadata, documentation and benchmark IPv4 addresses', () => {
 for(const address of ['127.0.0.1','10.0.0.1','172.16.1.1','192.168.1.1','169.254.169.254',
 '100.100.100.100','198.18.0.1','192.0.2.1','198.51.100.4','203.0.113.3','::1']){
 assert.equal(isPublicIPv4(address),false,address);
 }
 assert.equal(isPublicIPv4('8.8.8.8'),true);
});
test('rate limiter resets after window and rejects the seventh call', () => {
 let record;
 for(let i=0;i<6;i++){const result=limitWindow(1000,record);record=result.next;assert.equal(result.allowed,true);}
 assert.equal(limitWindow(1000,record).allowed,false);
 assert.equal(limitWindow(61001,record).allowed,true);
});
