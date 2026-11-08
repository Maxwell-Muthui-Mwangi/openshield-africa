import {randomUUID} from 'node:crypto';
export function validOrganizationName(name){
 return typeof name==='string'&&name.trim().length>=2&&name.trim().length<=120;
}
export function validOrganizationSlug(slug){
 return typeof slug==='string'&&/^[a-z0-9][a-z0-9-]{2,62}$/.test(slug);
}
export async function createOrganization({name,slug,userId},pool){
 if(!validOrganizationName(name)||!validOrganizationSlug(slug))throw Error('Valid organization name and slug required.');
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const org=await client.query('INSERT INTO organizations(name,slug,created_by) VALUES($1,$2,$3) RETURNING id,name,slug,created_at',[name.trim(),slug,userId]);
  await client.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')",[org.rows[0].id,userId]);
  await client.query('COMMIT');
  return org.rows[0];
 }catch(error){await client.query('ROLLBACK');throw error}
 finally{client.release()}
}
export async function listOrganizations(dbQuery,userId){
 const result=await dbQuery(`SELECT o.id,o.name,o.slug,m.role,o.created_at
  FROM organizations o JOIN organization_members m ON m.organization_id=o.id
  WHERE m.user_id=$1 ORDER BY o.created_at DESC`,[userId]);
 return result.rows;
}
export async function organizationAccess(dbQuery,organizationId,userId,roles=null){
 const result=await dbQuery(`SELECT role FROM organization_members
  WHERE organization_id=$1 AND user_id=$2`,[organizationId,userId]);
 const role=result.rows[0]?.role;
 return role&&(!roles||roles.includes(role))?role:null;
}
export async function organizationMembers(dbQuery,organizationId,userId){
 if(!await organizationAccess(dbQuery,organizationId,userId))return null;
 const result=await dbQuery(`SELECT u.id,u.email,m.role,m.created_at
  FROM organization_members m JOIN users u ON u.id=m.user_id
  WHERE m.organization_id=$1 ORDER BY m.created_at`,[organizationId]);
 return result.rows;
}
