import {database} from './database.js';
export async function outboxMetrics(pool=database()){
 const result=await pool.query(`
 SELECT status,count(*)::int AS total,
  count(*) FILTER(WHERE expires_at<=now())::int AS expired,
  count(*) FILTER(WHERE status='pending' AND available_at<=now())::int AS due,
  coalesce(max(extract(epoch from now()-created_at))
   FILTER(WHERE status='pending' AND available_at<=now()),0)::int AS oldest_due_seconds
 FROM email_outbox GROUP BY status`);
 return {statuses:result.rows,checkedAt:new Date().toISOString()};
}
export async function cleanupOutbox(pool=database()){
 const r=await pool.query(`DELETE FROM email_outbox
  WHERE status IN ('sent','dead') AND created_at<now()-interval '30 days'`);
 return {deleted:r.rowCount};
}
