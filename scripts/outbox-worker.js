import {processOutboxBatch} from '../server/outbox-worker.js';
import {database} from '../server/database.js';
import {encryptionKey} from '../server/outbox-crypto.js';
if(process.env.OUTBOX_WORKER_ENABLED!=='true')throw Error('Set OUTBOX_WORKER_ENABLED=true to run the worker.');
encryptionKey();
try{
 const result=await processOutboxBatch();
 console.log('Outbox batch processed:',JSON.stringify(result));
}finally{await database().end()}
