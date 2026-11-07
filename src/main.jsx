import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ShieldCheck,Globe,Activity,Lock,CheckCircle2,AlertTriangle,ArrowRight,Download,FileCheck2} from 'lucide-react';
import './style.css';

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
 async function assess(event){
  event.preventDefault();if(!consent){setError('Confirm you are authorised to assess this domain.');return}
  setError('');setBusy(true);
  try{
   const response=await fetch('/api/assess',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||'Assessment failed');
   setReport(data);setIllustrative(false);
  }catch(err){setError(err.message+' — Run the API locally and verify the allowlist.')}
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
   <div className="sectionhead"><h2>Website security assessment</h2><span>Read-only checks · local API</span></div>
   <form className="search" onSubmit={assess}><Globe size={20}/>
    <input type="url" placeholder="https://your-authorised-domain.org" value={url} onChange={e=>setUrl(e.target.value)} required/>
    <button disabled={busy||!consent}>{busy?'Checking…':'Assess domain'} <ArrowRight size={16}/></button>
   </form>
   <label className="consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>
    <span>I own this domain or have explicit written permission to perform these read-only configuration checks.</span></label>
   <p className="hint">Domains must be listed in ALLOWED_DOMAINS on the local API. No active exploitation or intrusion is performed.</p>
   {error&&<div role="alert" className="error">{error}</div>}
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
