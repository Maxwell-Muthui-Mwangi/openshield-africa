import net from 'node:net';

export function validateTarget(input, allowedDomains) {
  if (typeof input !== 'string' || input.length > 253) throw Error('Provide an HTTPS domain root.');
  let url;
  try { url = new URL(input); } catch { throw Error('Invalid URL.'); }
  if (url.protocol !== 'https:' || url.port || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw Error('Only HTTPS domain roots without ports, paths, or query strings are allowed.');
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname.endsWith('.') || net.isIP(hostname) || !/^[a-z0-9.-]+$/.test(hostname) ||
      hostname.length > 253 || hostname.split('.').some(part => !part || part.length > 63 ||
      part.startsWith('-') || part.endsWith('-'))) throw Error('A valid DNS hostname is required.');
  if (!allowedDomains.includes(hostname)) throw Error('Domain not allowlisted. Written authorisation is required.');
  return { hostname, origin: url.origin };
}

export function isPublicIPv4(ip) {
  if (net.isIP(ip) !== 4) return false;
  const [a,b,c] = ip.split('.').map(Number);
  // Reject non-global, benchmark, documentation and reserved IPv4 ranges.
  if (a === 0 || a === 10 || a === 127 || a >= 224 ||
      a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 ||
      a === 192 && b === 168 || a === 100 && b >= 64 && b <= 127 ||
      a === 192 && b === 0 || a === 192 && b === 88 && c === 99 ||
      a === 192 && b === 0 && c === 0 || a === 198 && (b === 18 || b === 19) ||
      a === 198 && b === 51 && c === 100 || a === 203 && b === 0 && c === 113 ||
      a === 192 && b === 0 && c === 2 || a === 192 && b === 0 && c === 0 ||
      a === 192 && b === 0 || a === 192 && b === 0) return false;
  return true;
}

export function limitWindow(now, record, windowMs=60000, max=6) {
  const current = record && now-record.start<windowMs ? record : {start:now,count:0};
  const next = {start:current.start,count:current.count+1};
  return {next,allowed:next.count<=max};
}
