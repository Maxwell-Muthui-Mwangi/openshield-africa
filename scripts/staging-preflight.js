import {safeStagingEnvironment} from '../server/release-gate.js';
import {databaseConfig} from '../server/db-config.js';
import {smtpConfiguration} from './check-smtp.js';

export function stagingPreflight(env){
 const issues=[...safeStagingEnvironment(env).issues];
 if(env.STAGING_VERIFY_ENABLED!=='true')issues.push('STAGING_VERIFY_ENABLED must be explicitly true.');
 if(!env.DATABASE_URL)issues.push('DATABASE_URL missing.');
 if(!env.SMTP_HOST||!env.MAIL_FROM)issues.push('SMTP transport settings missing.');
 if(env.COOKIE_SECURE!=='true')issues.push('Staging session cookies must be Secure.');
 if(!env.APP_ORIGIN||!env.APP_ORIGIN.startsWith('https://'))issues.push('Private staging HTTPS origin required.');
 if(env.LOCAL_SCAN_ENABLED==='true')issues.push('Local network scanner must remain disabled during connectivity preflight.');
 if(env.DB_MODE!=='managed')issues.push('Phase 4 private staging requires DB_MODE=managed.');
 if(env.DATABASE_SSL!=='require')issues.push('Managed staging database requires DATABASE_SSL=require.');
 try{databaseConfig(env)}catch{issues.push('Managed PostgreSQL configuration invalid.');}
 try{smtpConfiguration(env)}catch{issues.push('SMTP transport configuration invalid.');}
 if(!env.SMTP_USER||!env.SMTP_PASSWORD)issues.push('Staging SMTP authentication credentials required.');
 return {safe:issues.length===0,issues};
}
if(process.argv[1]?.endsWith('staging-preflight.js')){
 const result=stagingPreflight(process.env);
 console.log(JSON.stringify({event:'staging_preflight',status:result.safe?'pass':'blocked',issues:result.issues}));
 if(!result.safe)process.exitCode=1;
}
