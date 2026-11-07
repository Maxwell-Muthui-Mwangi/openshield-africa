import test from 'node:test';
import assert from 'node:assert/strict';
import {smtpConfiguration} from '../scripts/check-smtp.js';

test('SMTP requires strict supported transport and sender',()=>{
 assert.throws(()=>smtpConfiguration({SMTP_HOST:'smtp.example.org',SMTP_PORT:'25',MAIL_FROM:'a@example.org'}));
 assert.throws(()=>smtpConfiguration({SMTP_HOST:'smtp.example.org',SMTP_PORT:'587',MAIL_FROM:'a@example.org',SMTP_USER:'u'}));
});
test('SMTP 587 requires STARTTLS and 465 requires implicit TLS',()=>{
 const base={SMTP_HOST:'smtp.example.org',MAIL_FROM:'a@example.org'};
 assert.deepEqual({secure:smtpConfiguration({...base,SMTP_PORT:'587'}).secure,requireTLS:smtpConfiguration({...base,SMTP_PORT:'587'}).requireTLS},{secure:false,requireTLS:true});
 assert.deepEqual({secure:smtpConfiguration({...base,SMTP_PORT:'465'}).secure,requireTLS:smtpConfiguration({...base,SMTP_PORT:'465'}).requireTLS},{secure:true,requireTLS:false});
});
