import nodemailer from 'nodemailer';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export function smtpConfiguration(env=process.env){
 const {SMTP_HOST,SMTP_PORT,SMTP_USER,SMTP_PASSWORD,MAIL_FROM}=env;
 if(!SMTP_HOST||!MAIL_FROM||!SMTP_PORT)throw Error('SMTP_HOST, SMTP_PORT and MAIL_FROM are required.');
 const port=Number(SMTP_PORT);
 if(!Number.isInteger(port)||![465,587].includes(port))throw Error('SMTP_PORT must be 465 or 587.');
 if(Boolean(SMTP_USER)!==Boolean(SMTP_PASSWORD))throw Error('SMTP_USER and SMTP_PASSWORD must both be set or both omitted.');
 return {host:SMTP_HOST,port,secure:port===465,requireTLS:port===587,
  auth:SMTP_USER?{user:SMTP_USER,pass:SMTP_PASSWORD}:undefined};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const transport=nodemailer.createTransport(smtpConfiguration());
 try{
  await transport.verify();
  console.log('SMTP transport verified: connection, TLS and authentication succeeded. No email sent.');
 }catch(error){
  console.error('SMTP verification failed:',error.code||error.name||'transport error');
  process.exitCode=1;
 }finally{transport.close()}
}
