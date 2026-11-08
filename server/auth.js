import {randomBytes,scrypt as scryptCb,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCb);
export const sessionHash=token=>createHash('sha256').update(token).digest('hex');
export function newToken(){return randomBytes(32).toString('base64url')}
export async function hashPassword(password){
 if(typeof password!=='string'||password.length<12||password.length>256)throw Error('Password must contain 12–256 characters.');
 const salt=randomBytes(16).toString('hex');
 const derived=await scrypt(password,salt,64);
 return 'scrypt:'+salt+':'+derived.toString('hex');
}
export async function verifyPassword(password,stored){
 if(typeof password!=='string'||typeof stored!=='string'||!stored.startsWith('scrypt:'))return false;
 const [,salt,hex]=stored.split(':');
 if(!/^[0-9a-f]{32}$/.test(salt)||!/^[0-9a-f]{128}$/.test(hex))return false;
 const expected=Buffer.from(hex,'hex');
 const actual=await scrypt(password,salt,expected.length);
 return timingSafeEqual(expected,actual);
}
export function sessionCookie(token,secure=false){return 'openshield_session='+encodeURIComponent(token)+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800'+(secure?'; Secure':'')}
export function readSessionCookie(value=''){
 const part=value.split(';').map(x=>x.trim()).find(x=>x.startsWith('openshield_session='));
 return part?decodeURIComponent(part.slice('openshield_session='.length)):null;
}
