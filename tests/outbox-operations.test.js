import test from 'node:test';
import assert from 'node:assert/strict';
import {outboxMetrics,cleanupOutbox} from '../server/outbox-operations.js';
test('metrics expose status counts without message contents',async()=>{
 const metrics=await outboxMetrics({query:async()=>({rows:[{status:'pending',total:2,expired:0,due:1}]})});
 assert.equal(metrics.statuses[0].total,2);
 assert.equal(Object.hasOwn(metrics,'payload'),false);
});
test('cleanup returns only number of purged records',async()=>{
 const result=await cleanupOutbox({query:async sql=>{assert.match(sql,/30 days/);return {rowCount:3}}});
 assert.deepEqual(result,{deleted:3});
});
