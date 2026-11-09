import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const api=readFileSync(resolve('server/index.js'),'utf8');
const netlify=readFileSync(resolve('netlify.toml'),'utf8');
const renderPlan=readFileSync(resolve('docs/RENDER_PRIVATE_BACKEND_PLAN.md'),'utf8');

test('backend defaults to loopback and does not trust a public HOST override',()=>{
 assert.match(api,/const HOST='127\.0\.0\.1'/);
 assert.match(api,/server\.listen\(PORT,HOST/);
});
test('Netlify API routes are disabled before SPA fallback',()=>{
 const deny=netlify.indexOf('from = "/api/*"');
 const spa=netlify.indexOf('from = "/*"');
 assert.ok(deny>=0&&spa>deny);
 assert.match(netlify,/to = "\/\.netlify\/functions\/api-unavailable"/);
});
test('Render plan requires private service and no frontend proxy',()=>{
 assert.match(renderPlan,/private service/i);
 assert.match(renderPlan,/Do not configure Netlify rewrites/i);
});
