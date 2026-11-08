import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const url=process.env.INTEGRATION_DATABASE_URL;
if(!url||!new URL(url).pathname.endsWith('_test'))throw Error('Isolated _test PostgreSQL database required.');
process.env.DATABASE_URL=url;process.env.DB_MODE='self-hosted';
const {database,query}=await import('../../server/database.js');
const {createOrganization,listOrganizations,organizationMembers,organizationAccess}=await import('../../server/organizations.js');

test('organizations enforce owner membership and exclude unrelated users', {timeout:30000},async()=>{
 const suffix=randomUUID().slice(0,8);
 const a=(await query("INSERT INTO users(email,password_hash) VALUES($1,'test') RETURNING id",['owner-'+suffix+'@example.org'])).rows[0];
 const b=(await query("INSERT INTO users(email,password_hash) VALUES($1,'test') RETURNING id",['outsider-'+suffix+'@example.org'])).rows[0];
 try{
  const org=await createOrganization({name:'Test Security Team',slug:'team-'+suffix,userId:a.id},database());
  assert.equal((await listOrganizations(query,a.id)).length,1);
  assert.deepEqual(await listOrganizations(query,b.id),[]);
  assert.equal(await organizationAccess(query,org.id,a.id),'owner');
  assert.equal(await organizationAccess(query,org.id,b.id),null);
  assert.equal(await organizationMembers(query,org.id,b.id),null);
  const members=await organizationMembers(query,org.id,a.id);
  assert.equal(members.length,1);assert.equal(members[0].role,'owner');
  assert.equal(members[0].email,'owner-'+suffix+'@example.org');
  await assert.rejects(()=>createOrganization({name:'Another',slug:'team-'+suffix,userId:b.id},database()),e=>e.code==='23505');
  assert.deepEqual(await listOrganizations(query,b.id),[],'failed create must roll back membership');
 }finally{
  await query('DELETE FROM organizations WHERE created_by=$1',[a.id]);
  await query('DELETE FROM users WHERE id IN ($1,$2)',[a.id,b.id]);
 }
});
