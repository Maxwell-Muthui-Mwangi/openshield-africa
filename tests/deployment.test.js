import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDeployment} from '../server/deployment.js';

const base={NODE_ENV:'production',APP_ORIGIN:'https://app.example.org',COOKIE_SECURE:'true',REGISTRATION_ENABLED:'false',PUBLIC_SCAN_ENABLED:'false',SMTP_HOST:'smtp.example.org',SMTP_PORT:'587',MAIL_FROM:'noreply@example.org',DATABASE_URL:'postgres://localhost/test'};
test('safe baseline passes environment guard',()=>assert.doesNotThrow(()=>validateDeployment(base)));
test('production refuses insecure origins and cookies',()=>{
 assert.throws(()=>validateDeployment({...base,APP_ORIGIN:'http://app.example.org'}));
 assert.throws(()=>validateDeployment({...base,COOKIE_SECURE:'false'}));
});
test('production refuses unreviewed public scanning and registration',()=>{
 assert.throws(()=>validateDeployment({...base,PUBLIC_SCAN_ENABLED:'true'}));
 assert.throws(()=>validateDeployment({...base,REGISTRATION_ENABLED:'true'}));
});
test('production requires SMTP and PostgreSQL',()=>{
 assert.throws(()=>validateDeployment({...base,SMTP_HOST:''}));
 assert.throws(()=>validateDeployment({...base,DATABASE_URL:''}));
});
