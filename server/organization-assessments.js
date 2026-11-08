import {organizationRole} from './organization-security.js';

const severityWeight={critical:4,high:3,medium:2,low:1};
export function prioritizeFindings(checks){
 if(!Array.isArray(checks))throw Error('Invalid assessment findings.');
 return checks.filter(c=>c.status!=='pass').map(c=>({
  key:String(c.id||'').slice(0,80),
  name:String(c.name||'').slice(0,160),
  severity:severityWeight[c.severity]?c.severity:'low',
  recommendation:String(c.recommendation||'').slice(0,1000)
 })).filter(c=>c.key).sort((a,b)=>severityWeight[b.severity]-severityWeight[a.severity]);
}
export async function assessOrganizationAsset(pool,{orgId,assetId,userId,runAssessment,executionGuard=null}){
 const client=await pool.connect();
 try{
  const role=await organizationRole((sql,args)=>client.query(sql,args),orgId,userId);
  if(!['owner','admin','analyst'].includes(role))return null;
  // No scan begins without current proof, scoped to the same organization.
  const asset=await client.query(`SELECT hostname FROM organization_assets
   WHERE id=$1 AND organization_id=$2 AND verified_at>now()-interval '30 days'`,[assetId,orgId]);
  if(!asset.rows.length)throw Error('Current organization DNS ownership proof required.');
  const report=await runAssessment(asset.rows[0].hostname);
  if(!Number.isInteger(report.score)||report.score<0||report.score>100)throw Error('Invalid assessment score.');
  const findings=prioritizeFindings(report.checks);
  await client.query('BEGIN');
  // Recheck authorization and proof after network I/O; roles/proofs may have changed.
  const access=await client.query(`SELECT 1 FROM organization_members m
   JOIN organization_assets a ON a.organization_id=m.organization_id
   WHERE m.organization_id=$1 AND m.user_id=$2 AND m.role IN ('owner','admin','analyst')
    AND a.id=$3 AND a.verified_at>now()-interval '30 days'`,[orgId,userId,assetId]);
  if(!access.rows.length)throw Error('Authorization or DNS proof expired during assessment.');
  if(executionGuard&&!await executionGuard(client))throw Error('Scheduled assessment was cancelled or superseded.');
  const stored=await client.query(`INSERT INTO organization_assessments(organization_id,asset_id,initiated_by,score,snapshot)
   VALUES($1,$2,$3,$4,$5::jsonb) RETURNING id,created_at`,[orgId,assetId,userId,report.score,JSON.stringify(report)]);
  for(const finding of findings){
   await client.query(`INSERT INTO organization_remediations(organization_id,assessment_id,finding_key,severity)
    VALUES($1,$2,$3,$4) ON CONFLICT(assessment_id,finding_key) DO NOTHING`,
   [orgId,stored.rows[0].id,finding.key,finding.severity]);
  }
  await client.query(`INSERT INTO organization_audit_events(organization_id,actor_user_id,action)
   VALUES($1,$2,'assessment.completed')`,[orgId,userId]);
  await client.query('COMMIT');
  return {id:stored.rows[0].id,createdAt:stored.rows[0].created_at,score:report.score,findings};
 }catch(error){try{await client.query('ROLLBACK')}catch{}throw error}
 finally{client.release()}
}
export async function organizationReport(query,{orgId,userId}){
 if(!await organizationRole(query,orgId,userId))return null;
 const [org,assets,assessments,remediations]=await Promise.all([
  query('SELECT name,slug FROM organizations WHERE id=$1',[orgId]),
  query('SELECT hostname,verified_at FROM organization_assets WHERE organization_id=$1 ORDER BY hostname',[orgId]),
  query(`SELECT a.id,a.asset_id,s.hostname,a.score,a.created_at,a.snapshot
   FROM organization_assessments a JOIN organization_assets s ON s.id=a.asset_id
   WHERE a.organization_id=$1 ORDER BY a.created_at DESC LIMIT 100`,[orgId]),
  query(`SELECT r.id,r.assessment_id,r.finding_key,r.severity,r.status,r.assigned_to,r.updated_at
   FROM organization_remediations r WHERE r.organization_id=$1
   ORDER BY CASE r.severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC,r.updated_at DESC LIMIT 500`,[orgId])
 ]);
 return {organization:org.rows[0],generatedAt:new Date().toISOString(),assets:assets.rows,
  assessments:assessments.rows,remediations:remediations.rows,
  disclaimer:'Read-only configuration checks, not penetration testing, vulnerability certification or a comprehensive security audit.'};
}
export async function updateRemediation(query,{orgId,userId,remediationId,status}){
 if(!['open','in_progress','resolved'].includes(status))throw Error('Invalid remediation status.');
 const role=await organizationRole(query,orgId,userId);
 if(!['owner','admin','analyst'].includes(role))return null;
 const result=await query(`UPDATE organization_remediations SET status=$4,updated_at=now()
  WHERE id=$1 AND organization_id=$2 AND EXISTS
  (SELECT 1 FROM organization_members WHERE organization_id=$2 AND user_id=$3 AND role IN ('owner','admin','analyst'))
  RETURNING id,status,updated_at`,[remediationId,orgId,userId,status]);
 if(!result.rows.length)return null;
 await query(`INSERT INTO organization_audit_events(organization_id,actor_user_id,action)
 VALUES($1,$2,'remediation.updated')`,[orgId,userId]);
 return result.rows[0];
}
