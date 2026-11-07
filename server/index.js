import http from 'node:http';
import dns from 'node:dns/promises';
import https from 'node:https';
import {evaluate} from './checks.js';
import {validateTarget,isPublicIPv4,limitWindow} from './safety.js';

const PORT=Number(process.env.PORT||8787);
const HOST='127.0.0.1';
const ALLOWED=(process.env.ALLOWED_DOMAINS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
const usage=new Map();

async function assess(input) {
 const {hostname,origin}=validateTarget(input,ALLOWED);
 // Resolve every IPv4 record and fail closed if any address is restricted.
 const addresses=await dns.resolve4(hostname);
 if (!addresses.length || addresses.some(ip=>!isPublicIPv4(ip))) throw Error('Restricted or unresolved target IP address.');
 const ip=addresses[0];
 const headers=await new Promise((resolve,reject)=>{
  const req=https.request({hostname,port:443,path:'/',method:'HEAD',timeout:5000,
   lookup:(_hostname,_options,cb)=>cb(null,ip,4),
   headers:{'User-Agent':'OpenShieldAfrica/0.1'}},
   res=>{res.resume();resolve(new Headers(res.headers))});
  req.on('timeout',()=>req.destroy(Error('Assessment timed out.')));
  req.on('error',reject);
  req.end();
 });
 return {url:origin,assessedAt:new Date().toISOString(),...evaluate(headers)};
}

const server=http.createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.url==='/api/health'&&req.method==='GET'){res.end(JSON.stringify({status:'ok',scope:'local-only'}));return}
 if(req.url!=='/api/assess'||req.method!=='POST'){res.writeHead(404);res.end(JSON.stringify({error:'Not found'}));return}
 const key=req.socket.remoteAddress||'local';
 const {next,allowed}=limitWindow(Date.now(),usage.get(key));
 usage.set(key,next);
 if(!allowed){res.writeHead(429,{'Retry-After':'60'});res.end(JSON.stringify({error:'Assessment request limit reached. Try later.'}));return}
 if(usage.size>100){for(const [ip,entry] of usage){if(Date.now()-entry.start>60000)usage.delete(ip)}}
 let raw='';
 try{
  if(req.headers['content-type']?.split(';')[0].trim()!=='application/json')throw Error('JSON content type required.');
  for await(const chunk of req){raw+=chunk;if(raw.length>4096)throw Error('Request too large.')}
  const body=JSON.parse(raw);
  const result=await assess(body.url);
  res.end(JSON.stringify(result));
 }catch(error){res.writeHead(400);res.end(JSON.stringify({error:error.message}))}
});
server.listen(PORT,HOST,()=>console.log(`OpenShield API bound to http://${HOST}:${PORT}`));
