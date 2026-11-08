import {readFileSync} from 'node:fs';
import {evaluateReleaseGate,safeStagingEnvironment} from '../server/release-gate.js';

const environment=safeStagingEnvironment();
if(!environment.safe){console.error(JSON.stringify({decision:'NO_GO',issues:environment.issues}));process.exitCode=1}
else{
 const file=process.argv[2];
 if(!file){console.log(JSON.stringify({decision:'NO_GO',reason:'Evidence manifest required; no deployment authorized.'}));process.exitCode=1}
 else{
  try{
   const evidence=JSON.parse(readFileSync(file,'utf8'));
   const result=evaluateReleaseGate(evidence.checks||{});
   console.log(JSON.stringify({decision:result.decision,missing:result.missing,evidenceId:String(evidence.evidenceId||'').slice(0,100)}));
   if(!result.approved)process.exitCode=1;
  }catch{console.error(JSON.stringify({decision:'NO_GO',reason:'Invalid or unreadable evidence manifest.'}));process.exitCode=1}
 }
}
