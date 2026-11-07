import nodemailer from 'nodemailer';
import {smtpConfiguration} from '../scripts/check-smtp.js';

let transporter;
export async function sendAuthEmail({to,subject,text}){
 if(!transporter)transporter=nodemailer.createTransport(smtpConfiguration());
 await transporter.sendMail({from:process.env.MAIL_FROM,to,subject,text});
}
