// Minimal text-only PDF generator: no external runtime dependency, no HTML parsing,
// no user-controlled PDF operators. Intended for concise executive summaries.
function safe(value,max=110){
 return String(value??'').normalize('NFKD').replace(/[^\x20-\x7e]/g,'?').slice(0,max);
}
function escapePdf(value){return safe(value).replace(/[\\()]/g,'\\$&')}
export function executivePdf(report){
 const org=safe(report.organization?.name||'Organization');
 const assessments=report.assessments||[],remediations=report.remediations||[];
 const latest=assessments[0];
 const lines=[
  'OPENSHIELD AFRICA - EXECUTIVE SECURITY SUMMARY',
  'Organization: '+org,
  'Generated: '+safe(report.generatedAt),
  'Assets registered: '+(report.assets||[]).length,
  'Assessments recorded: '+assessments.length,
  'Latest configuration score: '+(latest?latest.score+'/100':'Not assessed'),
  'Open remediation items: '+remediations.filter(x=>x.status!=='resolved').length,
  'Resolved remediation items: '+remediations.filter(x=>x.status==='resolved').length,
  ' ',
  'PRIORITY REMEDIATION ITEMS'
 ];
 for(const item of remediations.filter(x=>x.status!=='resolved').slice(0,14))
  lines.push(safe(item.severity).toUpperCase()+' | '+safe(item.finding_key,65)+' | '+safe(item.status));
 lines.push(' ','IMPORTANT: Read-only configuration checks only.');
 lines.push('Not a penetration test, comprehensive audit or certification.');
 const commands=['BT','/F1 12 Tf','50 780 Td','16 TL'];
 for(const [index,line] of lines.slice(0,35).entries()){
  if(index)commands.push('T*');
  commands.push('('+escapePdf(line)+') Tj');
 }
 commands.push('ET');
 const stream=commands.join('\n')+'\n';
 const objects=[
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  '<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'endstream'
 ];
 let output='%PDF-1.4\n',offsets=[0];
 for(let i=0;i<objects.length;i++){
  offsets.push(Buffer.byteLength(output));
  output+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';
 }
 const start=Buffer.byteLength(output);
 output+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
 for(const offset of offsets.slice(1))output+=String(offset).padStart(10,'0')+' 00000 n \n';
 output+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n';
 return Buffer.from(output,'ascii');
}
