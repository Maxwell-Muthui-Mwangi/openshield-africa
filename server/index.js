import http from 'node:http';
import dns from 'node:dns/promises';
import net from 'node:net';
import https from 'node:https';
import {evaluate} from './checks.js';

const PORT=Number(process.env.PORT||8787);
const HOST='127.0.0.1';
const ALLOWED=(process.env.ALLOWED_DOMAINS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);

function isPublic(ip){
 if(net.isIP(ip)===4){
  const [a,b,c]=ip.split('.').map(Number);
  return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a===192&&b===0||a===192&&b===0||a===198&&(b===18||b===19)||a===192&&b===88&&c===99||a===198&&b===51&&c===100||a===203&&b===0&&c===113);
 }
 if(net.isIP(ip)===6){const s=ip.toLowerCase();return !(s==='::1'||s==='::'||s.startsWith('fc')||s.startsWith('fd')||/^fe[89ab]/.test(s)||s.startsWith('::ffff:')||s.startsWith('2001:db8:'))}
 return false;
}

async function assess(input){
 const u=new URL(input);
 if(u.protocol!=='https:'||u.port||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('Only HTTPS domain roots are supported');
 const domain=u.hostname.toLowerCase();
 if(!ALLOWED.includes(domain))throw Error('Domain not allowlisted. Verify authorisation and configure ALLOWED_DOMAINS.');
 const addresses=await dns.lookup(domain,{all:true});
 if(!addresses.length||addresses.some(x=>!isPublic(x.address)))throw Error('Private or restricted network address blocked');
 const ip=addresses[0].address;
 const headers=await new Promise((resolve,reject)=>{
  const req=https.request({hostname:domain,port:443,path:'/',method:'HEAD',timeout:5000,
    lookup:(_hostname,_options,cb)=>cb(null,ip,net.isIP(ip)),
    headers:{'User-Agent':'OpenShieldAfrica/0.1'}},
    res=>{res.resume();resolve(new Headers(res.headers))});
  req.on('timeout',()=>req.destroy(Error('Timeout')));
  req.on('error',reject);
  req.end();
 });
 return {url:u.origin,...evaluate(headers)};
}

const server=http.createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json');
 res.setHeader('Cache-Control','no-store');
 if(req.url==='/api/health'&&req.method==='GET'){res.end(JSON.stringify({status:'ok'}));return}
 if(req.url!=='/api/assess'||req.method!=='POST'){res.writeHead(404);res.end('{}');return}
 let raw='';
 try{
  for await(const chunk of req){raw+=chunk;if(raw.length>4096)throw Error('Payload too large')}
  const body=JSON.parse(raw);
  if(typeof body.url!=='string')throw Error('Provide a valid URL');
  const result=await assess(body.url);
  res.end(JSON.stringify(result));
 }catch(error){res.writeHead(400);res.end(JSON.stringify({error:error.message}))}
});
server.listen(PORT,HOST,()=>console.log(`OpenShield API at http://${HOST}:${PORT}`));
