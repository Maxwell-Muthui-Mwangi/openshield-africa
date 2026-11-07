import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ShieldCheck,Globe,Activity,Lock,CheckCircle2,AlertTriangle,ArrowRight} from 'lucide-react';
import './style.css';

const demo={url:'https://example.org',score:60,checks:[
{name:'HTTPS enabled',status:'pass',detail:'Encrypted transport is configured (illustrative).'},
{name:'Strict-Transport-Security',status:'warning',detail:'HSTS header not observed (illustrative).'},
{name:'Content-Security-Policy',status:'warning',detail:'CSP header not observed (illustrative).'},
{name:'X-Content-Type-Options',status:'pass',detail:'nosniff is present (illustrative).'},
{name:'Referrer-Policy',status:'pass',detail:'Referrer policy observed (illustrative).'}]};

function App(){
 const [url,setUrl]=useState('');
 const [report,setReport]=useState(demo);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [illustrative,setIllustrative]=useState(true);
 async function assess(event){
  event.preventDefault();setError('');setBusy(true);
  try{
   const response=await fetch('/api/assess',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||'Assessment failed');
   setReport(data);setIllustrative(false);
  }catch(err){setError(err.message+' — Run the API locally and verify the allowlist.')}
  finally{setBusy(false)}
 }
 return <div className="app">
  <aside><div className="brand"><ShieldCheck/><span>OpenShield <b>Africa</b></span></div>
   <div className="nav active"><Activity size={18}/> Overview</div>
   <div className="nav"><Globe size={18}/> Assessments</div>
   <div className="nav"><Lock size={18}/> Security guidance</div>
   <div className="asidefoot">OPEN SOURCE · MVP 0.1<br/>Community-owned security</div>
  </aside>
  <main>
   <header><span>SECURITY WORKSPACE / OVERVIEW</span><span className="pill">Prototype</span></header>
   <section className="hero"><div><div className="eyebrow">DIGITAL RESILIENCE FOR EVERYONE</div>
    <h1>Security clarity.<br/><em>For every organisation.</em></h1>
    <p>Accessible website security configuration checks for community organisations and small institutions.</p></div>
    <ShieldCheck size={102} strokeWidth={1}/>
   </section>
   <div className="sectionhead"><h2>Website security assessment</h2><span>Read-only checks</span></div>
   <form className="search" onSubmit={assess}><Globe size={20}/>
    <input type="url" placeholder="https://your-authorised-domain.org" value={url} onChange={e=>setUrl(e.target.value)} required/>
    <button disabled={busy}>{busy?'Checking…':'Assess domain'} <ArrowRight size={16}/></button>
   </form>
   <p className="hint">Only assess websites you own or have written permission to assess. Domains must be configured on the server allowlist.</p>
   {error&&<div role="alert" className="error">{error}</div>}
   <div className="sectionhead"><h2>{illustrative?'Illustrative sample report':'Assessment results'}</h2><span>{report.url}</span></div>
   <div className="stats"><div className="stat"><span>Configuration score</span><strong>{report.score}<small>/100</small></strong><p>Heuristic, not certification</p></div>
    <div className="stat"><span>Controls checked</span><strong>{report.checks.length}</strong><p>Basic header and transport checks</p></div>
    <div className="stat"><span>Needs attention</span><strong>{report.checks.filter(x=>x.status!=='pass').length}</strong><p>Review the guidance below</p></div></div>
   <section className="findings"><div className="sectionhead"><h2>Security findings</h2><span>{illustrative?'SAMPLE DATA':'READ-ONLY CHECKS'}</span></div>
    {report.checks.map((check,index)=><div className="finding" key={index}>
      {check.status==='pass'?<CheckCircle2 className="ok"/>:<AlertTriangle className="warn"/>}
      <div><b>{check.name}</b><p>{check.detail}</p></div>
      <span className={'tag '+check.status}>{check.status}</span>
     </div>)}</section>
   <footer>OpenShield Africa · Public-interest cybersecurity infrastructure · No exploitation or intrusive scanning</footer>
  </main></div>;
}
createRoot(document.getElementById('root')).render(<App/>);
