import {readFile} from 'node:fs/promises';
import {database} from '../server/database.js';

// Only explicitly reviewed migrations run automatically.
// db/002_managed_public_hardening.sql is an optional provider-specific script.
const files=['001_init.sql','003_login_buckets.sql','004_email_identity.sql','005_auth_request_buckets.sql'];
try{
 for(const filename of files){
  const sql=await readFile(new URL('../db/'+filename,import.meta.url),'utf8');
  await database().query(sql);
  console.log('Applied '+filename);
 }
 console.log('OpenShield database schema ready.');
}finally{
 await database().end();
}
