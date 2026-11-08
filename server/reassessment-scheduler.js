import {randomUUID} from 'node:crypto';
import {organizationRole} from './organization-security.js';
import {assessOrganizationAsset} from './organization-assessments.js';

export async function configureReassessment(query,{orgId,assetId,userId,intervalHours,enabled=false}){
 if(!Number.isInteger(intervalHours)||intervalHours<24||intervalHours>720||typeof enabled!=='boolean')throw Error('Interval must be 24–720 hours.');
 if(!['owner','admin'].includes(await organizationRole(query,orgId,userId)))return null;
 const r=await query(`INSERT INTO organization_reassessment_schedules
 (organization_id,asset_id,authorized_by,interval_hours,next_run_at,enabled)
 SELECT $1,a.id,$3,$4,now()+($4::integer*interval '1 hour'),$5
 FROM organization_assets a WHERE a.id=$2 AND a.organization_id=$1
 AND a.verified_at>now()-interval '30 days'
 ON CONFLICT(organization_id,asset_id) DO UPDATE
 SET authorized_by=$3,interval_hours=$4,next_run_at=now()+($4*interval '1 hour'),
 enabled=$5,lease_id=NULL,lease_until=NULL
 RETURNING id,asset_id,interval_hours,next_run_at,enabled`,[orgId,assetId,userId,intervalHours,enabled]);
 if(!r.rows.length)return null;
 await query("INSERT INTO organization_audit_events(organization_id,actor_user_id,action) VALUES($1,$2,'reassessment.configured')",[orgId,userId]);
 return r.rows[0];
}
export async function listReassessments(query,{orgId,userId}){
 if(!await organizationRole(query,orgId,userId))return null;
 const r=await query(`SELECT id,asset_id,interval_hours,next_run_at,last_run_at,enabled,last_error_code
 FROM organization_reassessment_schedules WHERE organization_id=$1 ORDER BY next_run_at`,[orgId]);
 return r.rows;
}
export async function processReassessmentBatch(pool,{runAssessment,limit=3}){
 if(process.env.REASSESSMENT_WORKER_ENABLED!=='true'||process.env.LOCAL_SCAN_ENABLED!=='true'||process.env.NODE_ENV==='production')
  throw Error('Reassessment worker is restricted to explicitly approved local testing.');
 const client=await pool.connect();
 let jobs=[];
 try{
  await client.query('BEGIN');
  const due=await client.query(`SELECT s.id FROM organization_reassessment_schedules s
   JOIN organization_assets a ON a.id=s.asset_id AND a.organization_id=s.organization_id
   JOIN organization_members m ON m.organization_id=s.organization_id AND m.user_id=s.authorized_by
   WHERE s.enabled AND s.next_run_at<=now() AND (s.lease_until IS NULL OR s.lease_until<now())
   AND a.verified_at>now()-interval '30 days' AND m.role IN ('owner','admin')
   ORDER BY s.next_run_at FOR UPDATE OF s SKIP LOCKED LIMIT $1`,[Math.min(3,Math.max(1,limit))]);
  for(const row of due.rows){
   const lease=randomUUID();
   const result=await client.query(`UPDATE organization_reassessment_schedules
   SET lease_id=$2,lease_until=now()+interval '2 minutes'
   WHERE id=$1 RETURNING id,organization_id,asset_id,authorized_by,interval_hours,lease_id`,[row.id,lease]);
   jobs.push(result.rows[0]);
  }
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 const results=[];
 for(const job of jobs){
  let code=null;
  try{
   // This uses the same tenant authorization, proof validation and safe scanner as manual assessments.
   const assessment=await assessOrganizationAsset(pool,{orgId:job.organization_id,assetId:job.asset_id,userId:job.authorized_by,runAssessment});
   if(!assessment)code='ACCESS_REVOKED';
  }catch(e){code='ASSESSMENT_FAILED'}
  // Lease fencing prevents an expired worker from acknowledging a newer claim.
  const updated=await pool.query(`UPDATE organization_reassessment_schedules SET
   lease_id=NULL,lease_until=NULL,last_run_at=CASE WHEN $3::text IS NULL THEN now() ELSE last_run_at END,
   last_error_code=$3,
   enabled=CASE WHEN $3::text IS NULL THEN enabled ELSE false END,
   next_run_at=now()+(interval_hours*interval '1 hour')
   WHERE id=$1 AND lease_id=$2 AND enabled=true RETURNING id`,[job.id,job.lease_id,code]);
  results.push({id:job.id,acknowledged:!!updated.rowCount,success:code===null});
 }
 return results;
}
