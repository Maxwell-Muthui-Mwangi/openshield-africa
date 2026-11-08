// Refuse unsafe production settings. This does not authorize public deployment.
export function validateDeployment(env=process.env){
 if(env.NODE_ENV!=='production')return;
 const origin=new URL(env.APP_ORIGIN||'http://localhost');
 if(origin.protocol!=='https:')throw Error('Production APP_ORIGIN must be HTTPS.');
 if(env.COOKIE_SECURE!=='true')throw Error('Production cookies must be Secure.');
 if(env.REGISTRATION_ENABLED==='true')throw Error('Public registration requires a separately reviewed onboarding design.');
 if(env.PUBLIC_SCAN_ENABLED==='true')throw Error('Public scanning is blocked pending independent egress security review.');
 if(!env.SMTP_HOST||!env.SMTP_PORT||!env.MAIL_FROM)throw Error('Production SMTP settings are required.');
 if(!env.DATABASE_URL)throw Error('Production DATABASE_URL is required.');
}
