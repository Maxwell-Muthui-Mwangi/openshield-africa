import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ShieldCheck,Globe,Activity,Lock,CheckCircle2,AlertTriangle,ArrowRight,Download,FileCheck2} from 'lucide-react';
import './style.css';
import OrganizationWorkspace from './OrganizationWorkspace.jsx';

const demo={url:'https://example.org',score:60,checks:[
{name:'HTTPS enabled',status:'pass',severity:'high',detail:'Encrypted transport (illustrative).',recommendation:'Use HTTPS.'},
{name:'HTTP Strict Transport Security',status:'warning',severity:'medium',detail:'HSTS missing (illustrative).',recommendation:'Configure HSTS after testing HTTPS.'},
{name:'Content Security Policy',status:'warning',severity:'medium',detail:'CSP missing (illustrative).',recommendation:'Add a restrictive CSP.'},
{name:'MIME sniffing protection',status:'pass',severity:'low',detail:'nosniff observed (illustrative).',recommendation:'Set X-Content-Type-Options: nosniff.'},
{name:'Referrer privacy policy',status:'pass',severity:'low',detail:'Referrer-Policy observed (illustrative).',recommendation:'Configure Referrer-Policy.'}
]};

function App(){
 const [url,setUrl]=useState('');
 const [report,setReport]=useState(demo);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [illustrative,setIllustrative]=useState(true);
 const [consent,setConsent]=useState(false);
 const [user,setUser]=useState(null);
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [domains,setDomains]=useState([]);
 const [history,setHistory]=useState([]);
 const [challenge,setChallenge]=useState(null);
 const [verificationToken,setVerificationToken]=useState('');
 const [notice,setNotice]=useState('');
 const [authToken,setAuthToken]=useState(new URLSearchParams(window.location.search).get('token')||'');
 const [authPath,setAuthPath]=useState(window.location.pathname);
 async function completeEmailAction(){
  setError('');setNotice('');
  try{
   const endpoint=authPath==='/verify-email'?'verify-email':'reset-password';
   const data=await request('/api/auth/'+endpoint,{method:'POST',body:JSON.stringify({token:authToken,...(endpoint==='reset-password'?{password}:{})})});
   setNotice(data.message);setAuthToken('');
   window.history.replaceState({},'', '/');
   setAuthPath('/');
  }catch(e){setError(e.message)}
 }
 async function resendVerification(){
  setError('');setNotice('');
  try{
   const data=await request('/api/auth/resend-verification',{method:'POST',body:JSON.stringify({email})});
   setNotice(data.message);
  }catch(e){setError(e.message)}
 }
 async function forgotPassword(){
  setError('');setNotice('');
  try{
   const data=await request('/api/auth/forgot-password',{method:'POST',body:JSON.stringify({email})});
   setNotice(data.message);
  }catch(e){setError(e.message)}
 }
 async function request(path,options={}){
  const response=await fetch(path,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...options.headers}});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Request failed');
  return data;
 }
 async function auth(mode){
  setError('');setNotice('');
  try{
   const data=await request('/api/auth/'+mode,{method:'POST',body:JSON.stringify({email,password})});
   if(mode==='register'){setNotice(data.message);return}
   setUser(data.user);setPassword('');await refresh();
  }catch(e){setError(e.message)}
 }
 async function refresh(){
  try{
   const [d,h]=await Promise.all([request('/api/domains'),request('/api/assessments')]);
   setDomains(d.domains);setHistory(h.assessments);
  }catch(e){setError(e.message)}
 }
 async function addDomain(){
  setError('');setNotice('');
  try{
   const data=await request('/api/domains',{method:'POST',body:JSON.stringify({url})});
   setChallenge(data);setVerificationToken(data.dnsRecord.value.replace('openshield-verification=',''));
   await refresh();
  }catch(e){setError(e.message)}
 }
 async function renewDomain(domain){
  setError('');setNotice('');
  try{
   const data=await request('/api/domains/'+domain.id+'/renew',{method:'POST',body:'{}'});
   setChallenge(data);setVerificationToken(data.dnsRecord.value.replace('openshield-verification=',''));
   setNotice('Replace the previous DNS TXT value with this new challenge, then verify.');
   await refresh();
  }catch(e){setError(e.message)}
 }
 async function verifyDomain(){
  setError('');setNotice('');
  try{
   await request('/api/domains/'+challenge.domain.id+'/verify',{method:'POST',body:JSON.stringify({token:verificationToken})});
   setChallenge(null);setVerificationToken('');setNotice('DNS ownership verified. You may now assess the domain.');await refresh();
  }catch(e){setError(e.message)}
 }
 async function signOut(){
  try{await request('/api/auth/logout',{method:'POST',body:'{}'});}catch{}
  setUser(null);setDomains([]);setHistory([]);setChallenge(null);setIllustrative(true);setReport(demo);
 }
 async function loadReport(id){
  setError('');
  try{const data=await request('/api/assessments/'+id);setReport(data);setIllustrative(false)}
  catch(e){setError(e.message)}
 }
 async function assess(event){
  event.preventDefault();if(!consent){setError('Confirm you are authorised to assess this domain.');return}
  setError('');setBusy(true);
  try{
   const response=await fetch('/api/assess',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||'Assessment failed');
   setReport(data);setIllustrative(false);await refresh();
  }catch(err){setError(err.message+' — Ensure the API is running locally and DNS ownership is current.')}
  finally{setBusy(false)}
 }
 function downloadReport(){
  if(illustrative)return;
  const exported={...report,disclaimer:'Indicative header configuration checklist. Not an independent security audit.'};
  const file=new Blob([JSON.stringify(exported,null,2)],{type:'application/json'});
  const blobUrl=URL.createObjectURL(file);
  const link=document.createElement('a');
  link.href=blobUrl;link.download='openshield-assessment.json';link.click();
  URL.revokeObjectURL(blobUrl);
 }
 return <div className="app">
  <aside><div className="brand"><ShieldCheck/><span>OpenShield <b>Africa</b></span></div>
   <div className="nav active"><Activity size={18}/> Overview</div>
   <div className="nav"><Globe size={18}/> Assessments</div>
   <div className="nav"><Lock size={18}/> Security guidance</div>
   <div className="asidefoot">OPEN SOURCE · MVP 0.1<br/>Community-owned security</div>
  </aside>
  <main>
   <header><span>SECURITY WORKSPACE / OVERVIEW</span><span className="pill">Local prototype</span></header>
   <section className="hero"><div><div className="eyebrow">DIGITAL RESILIENCE FOR EVERYONE</div>
    <h1>Security clarity.<br/><em>For every organisation.</em></h1>
    <p>Accessible website security configuration checks for community organisations and small institutions.</p></div>
    <ShieldCheck size={102} strokeWidth={1}/>
   </section>
   <div className="sectionhead"><h2>Organisation workspace</h2><span>Local development · PostgreSQL</span></div>
   {(authPath==='/verify-email'||authPath==='/reset-password')&&<section className="authpanel">
    <h3>{authPath==='/verify-email'?'Verify your email':'Reset your password'}</h3>
    <p>Use the one-time link from your email. Links expire automatically.</p>
    {authPath==='/reset-password'&&<input aria-label="New password" type="password" placeholder="New password (12+ characters)" value={password} onChange={e=>setPassword(e.target.value)}/>}
    <button type="button" onClick={completeEmailAction}>{authPath==='/verify-email'?'Verify email':'Change password'}</button>
   </section>}
   {!user?<section className="authpanel">
    <h3>Sign in or create an account</h3>
    <p>Accounts and verified domain ownership are required before real assessments.</p>
    <input aria-label="Email address" type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}/>
    <input aria-label="Password" type="password" placeholder="Password (minimum 12 characters)" value={password} onChange={e=>setPassword(e.target.value)}/>
    <div className="authbuttons"><button type="button" onClick={()=>auth('login')}>Sign in</button><button type="button" className="outline" onClick={()=>auth('register')}>Create account</button><button type="button" className="outline" onClick={forgotPassword}>Forgot password?</button><button type="button" className="outline" onClick={resendVerification}>Resend verification</button></div>
   </section>:<section className="authpanel">
    <div className="sectionhead"><h3>Signed in as {user.email}</h3><button className="outline" type="button" onClick={signOut}>Sign out</button></div>
    <div className="sectionhead"><h3>Registered domains</h3><button type="button" className="outline" onClick={addDomain}>Register domain from URL below</button></div>
    {domains.length===0?<p>No domains registered yet.</p>:domains.map(d=><p key={d.id}>{d.hostname} — {d.verified_at&&Date.now()-new Date(d.verified_at).getTime()<30*86400000?'Verified (current)':'Verification required'} <button type="button" className="outline" onClick={()=>renewDomain(d)}>Renew DNS proof</button></p>)}
    {challenge&&<div className="dnsbox"><strong>DNS TXT ownership challenge</strong>
     <p>Record: {challenge.dnsRecord.name}</p><p>Value: {challenge.dnsRecord.value}</p>
     <p>Publish the record with your DNS provider, then select Verify.</p>
     <button type="button" onClick={verifyDomain}>Verify DNS ownership</button></div>}
    <h3>Recent assessments</h3>
    {history.length===0?<p>No saved assessments yet.</p>:history.map(item=><button className="historyrow" type="button" key={item.id} onClick={()=>loadReport(item.id)}>{item.hostname} · {item.score}/100 · {new Date(item.created_at).toLocaleString()}</button>)}
   </section>}
   {user&&<OrganizationWorkspace request={request} user={user}/>}
   <div className="sectionhead"><h2>Website security assessment</h2><span>Verified domains only · read-only checks</span></div>
   <form className="search" onSubmit={assess}><Globe size={20}/>
    <input type="url" placeholder="https://your-authorised-domain.org" value={url} onChange={e=>setUrl(e.target.value)} required/>
    <button disabled={busy||!consent||!user}>{busy?'Checking…':'Assess domain'} <ArrowRight size={16}/></button>
   </form>
   <label className="consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>
    <span>I own this domain or have explicit written permission to perform these read-only configuration checks.</span></label>
   <p className="hint">Domains require current DNS ownership proof (renewed every 30 days). No active exploitation or intrusion is performed.</p>
   {error&&<div role="alert" className="error">{error}</div>}{notice&&<div role="status" className="notice">{notice}</div>}
   <div className="sectionhead"><h2>{illustrative?'Illustrative sample report':'Assessment results'}</h2>
    {illustrative?<span>DEMO ONLY · {report.url}</span>:<button type="button" className="outline" onClick={downloadReport}><Download size={16}/> Export JSON report</button>}</div>
   <div className="stats"><div className="stat"><span>Configuration score</span><strong>{report.score}<small>/100</small></strong><p>Heuristic, not certification</p></div>
    <div className="stat"><span>Controls checked</span><strong>{report.checks.length}</strong><p>Basic header and transport checks</p></div>
    <div className="stat"><span>Needs attention</span><strong>{report.checks.filter(x=>x.status!=='pass').length}</strong><p>Review the guidance below</p></div></div>
   <section className="findings"><div className="sectionhead"><h2>Security findings</h2><span>{illustrative?'SAMPLE DATA':report.url}</span></div>
    {report.checks.map((check,index)=><div className="finding" key={check.id||index}>
      {check.status==='pass'?<CheckCircle2 className="ok"/>:<AlertTriangle className="warn"/>}
      <div><b>{check.name}</b><p>{check.detail}</p>
       {check.status!=='pass'&&check.recommendation&&<p className="remediation"><FileCheck2 size={14}/> {check.recommendation}</p>}</div>
      <span className={'tag '+check.status}>{check.status}</span>
     </div>)}</section>
   <footer>OpenShield Africa · Public-interest infrastructure · Reports are local to this session · No penetration testing</footer>
  </main></div>;
}
createRoot(document.getElementById('root')).render(<App/>);
