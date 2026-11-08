import {database} from '../server/database.js';
import {processReassessmentBatch} from '../server/reassessment-scheduler.js';
import {assess} from '../server/index.js';

if(process.env.REASSESSMENT_WORKER_ENABLED!=='true'||process.env.LOCAL_SCAN_ENABLED!=='true'||process.env.NODE_ENV==='production')
 throw Error('Explicit local-only reassessment worker approval required.');
const pool=database();
try{
 const results=await processReassessmentBatch(pool,{runAssessment:assess,limit:3});
 console.log(JSON.stringify({event:'reassessment_batch',claimed:results.length,completed:results.filter(r=>r.success&&r.acknowledged).length}));
}finally{await pool.end()}
