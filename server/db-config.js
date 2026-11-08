import {readFileSync} from 'node:fs';
/**
 * A deployment connects to exactly one PostgreSQL database.
 * Managed deployments require certificate-verified TLS.
 */
export function databaseConfig(env=process.env,readFile=readFileSync){
 const mode=env.DB_MODE||'self-hosted';
 if(!['self-hosted','managed'].includes(mode))throw Error('DB_MODE must be self-hosted or managed.');
 const connectionString=env.DATABASE_URL;
 if(!connectionString)throw Error('DATABASE_URL is required.');
 let url;
 try{url=new URL(connectionString)}catch{throw Error('Invalid DATABASE_URL.')}
 if(!['postgres:','postgresql:'].includes(url.protocol))throw Error('DATABASE_URL must use PostgreSQL.');
 if(!url.hostname||!url.pathname||url.pathname==='/')throw Error('DATABASE_URL must specify a host and database.');
 if(mode==='managed'){
  if(env.DATABASE_SSL==='disable')throw Error('Managed PostgreSQL requires TLS.');
  if(['false','0'].includes(String(env.NODE_TLS_REJECT_UNAUTHORIZED)))throw Error('TLS certificate verification must not be disabled.');
 }
 const poolSize=Number(env.DB_POOL_MAX||5);
 if(!Number.isInteger(poolSize)||poolSize<1||poolSize>20)throw Error('DB_POOL_MAX must be 1–20.');
 for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
 const config={connectionString:url.toString(),max:poolSize,connectionTimeoutMillis:5000,idleTimeoutMillis:30000,
  application_name:'openshield-africa'};
 // Managed TLS is verified against the system CA bundle by default.
 // DATABASE_CA_FILE can be used by the pool loader for private provider CAs.
 if(mode==='managed'||env.DATABASE_SSL==='require')config.ssl={rejectUnauthorized:true};
 if(env.DATABASE_CA_FILE){
  if(mode!=='managed'&&env.DATABASE_SSL!=='require')throw Error('CA file requires TLS.');
  config.ssl={rejectUnauthorized:true,ca:readFile(env.DATABASE_CA_FILE,'utf8')};
 }
 return {mode,config};
}
