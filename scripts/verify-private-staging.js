import {database} from '../server/database.js';
import {createTransport} from 'nodemailer';

if(process.env.NODE_ENV==='production')throw Error('Private staging verification only.');
if(process.env.STAGING_VERIFY_ENABLED!=='true')throw Error('STAGING_VERIFY_ENABLED=true required.');
if(process.env.REGISTRATION_ENABLED==='true'||process.env.PUBLIC_SCAN_ENABLED==='true')throw Error('Public features must remain disabled.');
if(!process.env.DATABASE_URL||!process.env.SMTP_HOST||!process.env.SMTP_PORT||!process.env.SMTP_USER||!process.env.SMTP_PASSWORD)throw Error('Staging database and SMTP credentials required.');
const db=database();
let databaseOk=false,smtpOk=false;
try{
 const result=await db.query('SELECT current_database() AS name,1 AS healthy');
 if(!result.rows[0]?.healthy)throw Error('Database health query failed.');
 databaseOk=true;
 const transport=createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT),secure:Number(process.env.SMTP_PORT)===465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD},connectionTimeout:5000,greetingTimeout:5000,socketTimeout:5000});
 try{await transport.verify();smtpOk=true}finally{transport.close()}
 console.log(JSON.stringify({event:'private_staging_connectivity',database:databaseOk?'pass':'fail',smtp:smtpOk?'pass':'fail',delivery:'not_tested'}));
}finally{await db.end()}
