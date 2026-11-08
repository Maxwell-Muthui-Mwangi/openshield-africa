import {createHash} from 'node:crypto';
import dns from 'node:dns/promises';
import {validateTarget} from './safety.js';
export function canonicalHostname(input){const host=new URL(input).hostname.toLowerCase();validateTarget(input,[host]);return host}
export const hashChallenge=challenge=>createHash('sha256').update(challenge).digest('hex');
export async function checkDnsOwnership(hostname,challenge,resolver=dns){
 const records=await resolver.resolveTxt('_openshield-challenge.'+hostname);
 const expected='openshield-verification='+challenge;
 return records.some(parts=>parts.join('').trim()===expected);
}
