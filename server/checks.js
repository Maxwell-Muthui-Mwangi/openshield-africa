export function evaluate(headers, secure=true) {
 const value = name => (headers.get(name)||'').trim();
 const hsts = value('strict-transport-security');
 const hstsAge = Number(hsts.match(/(?:^|;)\s*max-age\s*=\s*(\d+)/i)?.[1]||0);
 const csp = value('content-security-policy');
 const contentType = value('x-content-type-options').toLowerCase();
 const ref = value('referrer-policy').toLowerCase();
 const safeRef = ['no-referrer','same-origin','strict-origin','strict-origin-when-cross-origin'];
 const checks = [
  {id:'https',name:'HTTPS enabled',severity:'high',status:secure?'pass':'warning',
   detail:secure?'HTTPS transport was used.':'Use HTTPS for all website traffic.',
   recommendation:'Configure a trusted TLS certificate and redirect HTTP to HTTPS.'},
  {id:'hsts',name:'HTTP Strict Transport Security',severity:'medium',status:secure&&hstsAge>=15552000?'pass':'warning',
   detail:hstsAge>=15552000?'HSTS advertises at least 180 days.':'HSTS missing or below 180 days.',
   recommendation:'After confirming HTTPS reliability, configure Strict-Transport-Security with max-age of at least 15552000 seconds.'},
  {id:'csp',name:'Content Security Policy',severity:'medium',status:csp&&/(?:^|;)\s*(?:default-src|script-src)\s+/i.test(csp)?'pass':'warning',
   detail:csp?'CSP observed; manual inspection is still required.':'No applicable enforcing script/default CSP directive observed.',
   recommendation:'Deploy an enforcing CSP with appropriately restricted default-src and script-src directives. Review unsafe-inline and unsafe-eval.'},
  {id:'nosniff',name:'MIME sniffing protection',severity:'low',status:contentType==='nosniff'?'pass':'warning',
   detail:contentType==='nosniff'?'X-Content-Type-Options: nosniff observed.':'MIME sniffing protection not configured.',
   recommendation:'Set X-Content-Type-Options: nosniff.'},
  {id:'referrer',name:'Referrer privacy policy',severity:'low',status:safeRef.includes(ref)?'pass':'warning',
   detail:safeRef.includes(ref)?'A privacy-conscious Referrer-Policy was observed.':'Referrer-Policy absent or needs review.',
   recommendation:'Consider Referrer-Policy: strict-origin-when-cross-origin or no-referrer.'}
 ];
 return {checks,score:Math.round(checks.filter(x=>x.status==='pass').length/checks.length*100),
  scoreDescription:'Indicative configuration checklist only; not a vulnerability assessment or security certification.'};
}
