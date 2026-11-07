export function evaluate(headers,secure=true){
 const get=k=>headers.get(k)||'';
 const checks=[
 {name:'HTTPS enabled',status:secure?'pass':'warning',detail:secure?'Encrypted transport was used.':'HTTPS is required.'},
 {name:'Strict-Transport-Security',status:get('strict-transport-security')?'pass':'warning',detail:get('strict-transport-security')?'HSTS header observed; policy strength needs manual review.':'Add an appropriate HSTS policy after verifying HTTPS readiness.'},
 {name:'Content-Security-Policy',status:get('content-security-policy')?'pass':'warning',detail:get('content-security-policy')?'CSP present; review its effectiveness manually.':'Consider a restrictive Content-Security-Policy.'},
 {name:'X-Content-Type-Options',status:get('x-content-type-options').toLowerCase()==='nosniff'?'pass':'warning',detail:get('x-content-type-options').toLowerCase()==='nosniff'?'nosniff is present.':'Set X-Content-Type-Options: nosniff.'},
 {name:'Referrer-Policy',status:get('referrer-policy')?'pass':'warning',detail:get('referrer-policy')?'Referrer policy observed.':'Set a privacy-conscious Referrer-Policy.'}
 ];
 return {checks,score:Math.round(checks.filter(c=>c.status==='pass').length/checks.length*100)};
}
