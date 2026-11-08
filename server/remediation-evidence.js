import {organizationRole} from './organization-security.js';

export async function addRemediationEvidence(query,{orgId,remediationId,userId,note}){
 if(typeof note!=='string'||note.trim().length<8||note.length>2000)throw Error('Evidence note must be 8–2000 characters.');
 if(!['owner','admin','analyst'].includes(await organizationRole(query,orgId,userId)))return null;
 const result=await query(`INSERT INTO organization_remediation_evidence(organization_id,remediation_id,submitted_by,note)
 SELECT $1,r.id,$3,$4 FROM organization_remediations r
 WHERE r.organization_id=$1 AND r.id=$2
 RETURNING id,remediation_id,note,created_at`,[orgId,remediationId,userId,note.trim()]);
 if(!result.rows.length)return null;
 await query("INSERT INTO organization_audit_events(organization_id,actor_user_id,action) VALUES($1,$2,'remediation.evidence_added')",[orgId,userId]);
 return result.rows[0];
}
export async function listRemediationEvidence(query,{orgId,remediationId,userId}){
 if(!await organizationRole(query,orgId,userId))return null;
 const result=await query(`SELECT e.id,e.note,e.submitted_by,e.created_at,e.review_status,e.reviewed_by,e.reviewed_at,e.review_note
 FROM organization_remediation_evidence e JOIN organization_remediations r
 ON r.id=e.remediation_id AND r.organization_id=e.organization_id
 WHERE e.organization_id=$1 AND e.remediation_id=$2 ORDER BY e.created_at DESC LIMIT 100`,[orgId,remediationId]);
 return result.rows;
}

export async function reviewRemediationEvidence(query,{orgId,evidenceId,userId,status,note='' }){
 if(!['accepted','rejected'].includes(status)||typeof note!=='string'||note.length>1000)throw Error('Invalid evidence review.');
 const role=await organizationRole(query,orgId,userId);
 if(!['owner','admin'].includes(role))return null;
 const result=await query(`UPDATE organization_remediation_evidence e
 SET review_status=$4,reviewed_by=$3,reviewed_at=now(),review_note=$5
 WHERE e.id=$2 AND e.organization_id=$1 AND e.submitted_by<>$3
 AND EXISTS(SELECT 1 FROM organization_members WHERE organization_id=$1 AND user_id=$3 AND role IN ('owner','admin'))
 AND e.review_status='pending'
 RETURNING id,review_status,reviewed_at`,[orgId,evidenceId,userId,status,note.trim()]);
 if(!result.rows.length)return null;
 await query("INSERT INTO organization_audit_events(organization_id,actor_user_id,action) VALUES($1,$2,'remediation.evidence_reviewed')",[orgId,userId]);
 return result.rows[0];
}
