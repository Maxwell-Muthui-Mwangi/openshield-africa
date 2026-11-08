// Offline release-gate preflight. Does not access secrets or external infrastructure.
export function evaluateReleaseGate({ci,postgres,stagingDatabase,stagingSmtp,delivery,restore,egress,independentReview,reviewFindingsClosed,ownerApproval}){
 const checks={ci,postgres,stagingDatabase,stagingSmtp,delivery,restore,egress,independentReview,reviewFindingsClosed,ownerApproval};
 const missing=Object.entries(checks).filter(([,v])=>v!==true).map(([key])=>key);
 return {approved:missing.length===0,missing,decision:missing.length?'NO_GO':'READY_FOR_OWNER_RELEASE_DECISION'};
}
export function safeStagingEnvironment(env=process.env){
 const issues=[];
 if(env.NODE_ENV==='production')issues.push('Production mode prohibited for staging preflight.');
 if(env.REGISTRATION_ENABLED==='true')issues.push('Public registration must be disabled.');
 if(env.PUBLIC_SCAN_ENABLED==='true')issues.push('Public scanning must be disabled.');
 if(env.REASSESSMENT_WORKER_ENABLED==='true')issues.push('Reassessment worker must be disabled for preflight.');
 if(env.OUTBOX_WORKER_ENABLED==='true')issues.push('Outbox worker must be disabled for preflight.');
 if(env.APP_ORIGIN&&!/^https:\/\//.test(env.APP_ORIGIN))issues.push('Staging APP_ORIGIN must use HTTPS.');
 return {safe:issues.length===0,issues};
}
