export default async () => new Response(JSON.stringify({
 error:'OpenShield Africa API is disabled in this Netlify preview. No security assessments are performed.',
 code:'API_NOT_DEPLOYED'
}),{
 status:503,
 headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}
});
