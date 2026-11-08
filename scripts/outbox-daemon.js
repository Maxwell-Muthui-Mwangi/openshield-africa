import {processOutboxBatch} from '../server/outbox-worker.js';
import {outboxMetrics,cleanupOutbox} from '../server/outbox-operations.js';
import {database} from '../server/database.js';
import {encryptionKey} from '../server/outbox-crypto.js';

if(process.env.OUTBOX_WORKER_ENABLED!=='true')throw Error('OUTBOX_WORKER_ENABLED=true required.');
if(process.env.NODE_ENV==='production')throw Error('Production worker deployment requires a separate security approval.');
encryptionKey();
const interval=Number(process.env.OUTBOX_POLL_MS||5000);
if(!Number.isInteger(interval)||interval<1000||interval>60000)throw Error('OUTBOX_POLL_MS must be between 1000 and 60000.');
let stopping=false;
const stop=()=>{stopping=true};
process.on('SIGTERM',stop);process.on('SIGINT',stop);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ticks=0;
try{
 while(!stopping){
  try{
   const result=await processOutboxBatch();
   if(result.claimed||ticks%12===0){
    const metrics=await outboxMetrics();
    console.log(JSON.stringify({event:'outbox_cycle',...result,metrics}));
   }
   if(++ticks%720===0)console.log(JSON.stringify({event:'outbox_cleanup',...await cleanupOutbox()}));
  }catch(error){
   // Never log message bodies or token-bearing URLs.
   console.error(JSON.stringify({event:'outbox_cycle_error',code:String(error.code||error.name||'unknown').slice(0,80)}));
  }
  if(!stopping)await sleep(interval);
 }
}finally{
 await database().end();
 console.log(JSON.stringify({event:'outbox_worker_stopped'}));
}
