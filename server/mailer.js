import nodemailer from 'nodemailer';

// SMTP is mandatory for real email delivery. No tokens are logged or returned to callers.
let transporter;
export async function sendAuthEmail({to,subject,text}){
 const {SMTP_HOST,SMTP_PORT,SMTP_USER,SMTP_PASSWORD,MAIL_FROM}=process.env;
 if(!SMTP_HOST||!SMTP_PORT||!MAIL_FROM)throw Error('SMTP delivery is not configured.');
 if(!transporter)transporter=nodemailer.createTransport({
  host:SMTP_HOST,port:Number(SMTP_PORT),secure:Number(SMTP_PORT)===465,
  auth:SMTP_USER&&SMTP_PASSWORD?{user:SMTP_USER,pass:SMTP_PASSWORD}:undefined,
  requireTLS:Number(SMTP_PORT)!==465
 });
 await transporter.sendMail({from:MAIL_FROM,to,subject,text});
}
