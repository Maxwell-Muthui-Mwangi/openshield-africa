import React,{useEffect,useState} from 'react';
import {Building2,Users,Globe2,ShieldCheck,RefreshCw,FileText,Plus} from 'lucide-react';

export default function OrganizationWorkspace({request,user}){
 const [orgs,setOrgs]=useState([]),[selected,setSelected]=useState(''),[dashboard,setDashboard]=useState(null);
 const [members,setMembers]=useState([]),[assets,setAssets]=useState([]),[audit,setAudit]=useState([]);
 const [name,setName]=useState(''),[slug,setSlug]=useState(''),[url,setUrl]=useState('');
 const [inviteEmail,setInviteEmail]=useState(''),[inviteRole,setInviteRole]=useState('viewer');
 const [challenge,setChallenge]=useState(null),[message,setMessage]=useState(''),[error,setError]=useState('');
 const [invitation,setInvitation]=useState(null),[securityReport,setSecurityReport]=useState(null);
 async function loadOrgs(){const d=await request('/api/organizations');setOrgs(d.organizations);setSelected(s=>s||d.organizations[0]?.id||'')}
 async function loadWorkspace(id){
  if(!id)return;
  const base='/api/organizations/'+id;
  const [d,m,a,log]=await Promise.all([request(base+'/dashboard'),request(base+'/members'),request(base+'/assets'),request(base+'/audit')]);
  setDashboard(d.dashboard);setMembers(m.members);setAssets(a.assets);setAudit(log.events);
 }
 useEffect(()=>{loadOrgs().catch(e=>setError(e.message))},[user?.id]);
 useEffect(()=>{setDashboard(null);setAssets([]);setMembers([]);setAudit([]);setSecurityReport(null);loadWorkspace(selected).catch(e=>setError(e.message))},[selected]);
 async function action(fn){
  setError('');setMessage('');
  try{await fn();if(selected)await loadWorkspace(selected)}catch(e){setError(e.message)}
 }
 const post=(path,body)=>request(path,{method:'POST',body:JSON.stringify(body)});
 const base='/api/organizations/'+selected;
 return <section className="authpanel org-workspace">
  <div className="sectionhead"><h3><Building2 size={20}/> Organization security workspace</h3><span>Private staging · Tenant scoped</span></div>
  <p>Manage your organization's verified assets, members and audit activity. Organization scanning is disabled until separately approved.</p>
  <div className="org-controls">
   <label>Organization<select aria-label="Select organization" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Select organization</option>{orgs.map(o=><option key={o.id} value={o.id}>{o.name} ({o.role})</option>)}</select></label>
   <button className="outline" type="button" onClick={()=>action(loadOrgs)}><RefreshCw size={15}/> Refresh</button>
  </div>
  <details><summary>Create organization (staging only)</summary><div className="org-controls">
   <input aria-label="Organization name" placeholder="Organization name" value={name} onChange={e=>setName(e.target.value)}/>
   <input aria-label="Organization slug" placeholder="unique-org-slug" value={slug} onChange={e=>setSlug(e.target.value)}/>
   <button type="button" onClick={()=>action(async()=>{const r=await post('/api/organizations',{name,slug});await loadOrgs();setSelected(r.organization.id);setName('');setSlug('')})}>Create</button>
  </div></details>
  {selected&&dashboard&&<>
   <div className="org-metrics">
    <div><Globe2 size={20}/><strong>{dashboard.assets.total}</strong><span>Registered assets</span></div>
    <div><ShieldCheck size={20}/><strong>{dashboard.assets.verified}</strong><span>Current DNS proofs</span></div>
    <div><Users size={20}/><strong>{dashboard.members}</strong><span>Team members</span></div>
    <div><FileText size={20}/><strong>—</strong><span>Security score unavailable</span></div>
   </div>
   <h4>Asset inventory</h4>
   {assets.length===0?<p>No organization assets registered.</p>:assets.map(a=><div className="org-line" key={a.id}>
    <span>{a.hostname} · {a.verified_at&&Date.now()-new Date(a.verified_at).getTime()<30*86400000?'DNS verified':'Verification required'}</span>
    <button type="button" className="outline" onClick={()=>action(async()=>{const r=await post(base+'/assets/'+a.id+'/renew',{});setChallenge({asset:r.asset,dnsRecord:r.dnsRecord})})}>Renew proof</button>
   </div>)}
   <div className="org-controls"><input aria-label="Asset URL" placeholder="https://your-domain.org" value={url} onChange={e=>setUrl(e.target.value)}/><button type="button" onClick={()=>action(async()=>{const r=await post(base+'/assets',{url});setChallenge(r);setUrl('')})}><Plus size={15}/> Add asset</button></div>
   {challenge&&<div className="dnsbox"><strong>Publish DNS TXT proof</strong><p>{challenge.dnsRecord.name}</p><p>{challenge.dnsRecord.value}</p><button type="button" onClick={()=>action(async()=>{await post(base+'/assets/'+challenge.asset.id+'/verify',{token:challenge.dnsRecord.value.split('=')[1]});setChallenge(null);setMessage('DNS ownership verified.')})}>Verify DNS</button></div>}
   <h4>Team members</h4>
   {members.map(m=><div className="org-line" key={m.id}><span>{m.email} · {m.role}</span>
    {dashboard.role==='owner'&&m.role!=='owner'&&<select aria-label={'Role for '+m.email} value={m.role} onChange={e=>action(async()=>{await post(base+'/members/'+m.id+'/role',{role:e.target.value})})}>{['admin','analyst','viewer'].map(r=><option key={r}>{r}</option>)}</select>}
   </div>)}
   {['owner','admin'].includes(dashboard.role)&&<div className="org-controls"><input aria-label="Invite email" placeholder="Team member email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}/><select aria-label="Invitation role" value={inviteRole} onChange={e=>setInviteRole(e.target.value)}>{['viewer','analyst',...(dashboard.role==='owner'?['admin']:[])].map(r=><option key={r}>{r}</option>)}</select><button type="button" onClick={()=>action(async()=>{const r=await post(base+'/invitations',{email:inviteEmail,role:inviteRole});setInvitation(r.invitation);setInviteEmail('')})}>Create invitation</button></div>}
   {invitation&&<div className="dnsbox"><strong>Private staging invitation token</strong><p>Share securely with the intended recipient. This is not a public invitation workflow.</p><code>{invitation.token}</code><button className="outline" type="button" onClick={()=>setInvitation(null)}>Hide token</button></div>}
   <h4>Security reporting and remediation</h4>
   <p>Only assessments performed against currently DNS-verified assets are recorded. Live assessment is restricted to explicitly enabled local testing.</p>
   <button type="button" className="outline" onClick={()=>action(async()=>{const r=await request(base+'/report');setSecurityReport(r.report)})}>Load security report</button>
   {securityReport&&<>
    <p>{securityReport.assessments.length} recorded assessments · {securityReport.remediations.filter(r=>r.status!=='resolved').length} open or in-progress remediation items</p>
    {securityReport.assessments.slice(0,10).map(a=><div className="org-line" key={a.id}><span>{a.hostname} · Configuration score {a.score}/100</span><small>{new Date(a.created_at).toLocaleString()}</small></div>)}
    {securityReport.remediations.slice(0,50).map(r=><div className="org-line" key={r.id}><span>{r.finding_key} · {r.severity}</span><select aria-label={'Remediation '+r.finding_key} value={r.status} onChange={e=>action(async()=>{await post(base+'/remediations/'+r.id,{status:e.target.value});const next=await request(base+'/report');setSecurityReport(next.report)})}>{['open','in_progress','resolved'].map(s=><option key={s} value={s}>{s}</option>)}</select></div>)}
    <button type="button" className="outline" onClick={()=>{const blob=new Blob([JSON.stringify(securityReport,null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='openshield-security-report.json';a.click();URL.revokeObjectURL(u)}}><FileText size={15}/> Export security report (JSON)</button>
   </>}
   <h4>Recent activity</h4>
   {audit.length===0?<p>No recorded organization activity.</p>:audit.map((e,i)=><div className="org-line" key={i}><span>{e.action}</span><small>{new Date(e.created_at).toLocaleString()}</small></div>)}
   <button type="button" className="outline" onClick={()=>{const blob=new Blob([JSON.stringify({organizationId:selected,generatedAt:new Date().toISOString(),dashboard,assets,audit},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='openshield-organization-summary.json';a.click();URL.revokeObjectURL(u)}}><FileText size={15}/> Export organization summary</button>
  </>}
  {error&&<div role="alert" className="error">{error}</div>}{message&&<div role="status" className="notice">{message}</div>}
 </section>;
}
