import { HttpError,textValue } from './http';
import { organizationRole,organizationMemberRole,superuserSQL } from './authorization';
import { audit,parseRow } from './db';
export async function createOrganization(db:D1Database,actorId:string,input:Record<string,unknown>) {
 const name=textValue(input.name,'name',150),id=crypto.randomUUID();const description=input.description==null?null:textValue(input.description,'description',5000);const code=input.code==null?null:textValue(input.code,'code',80);
 const results=await db.batch<Record<string,unknown>>([
 db.prepare('INSERT INTO organizations(id,name,description,code) VALUES(?,?,?,?) RETURNING *').bind(id,name,description,code),
 db.prepare("INSERT INTO organization_members(id,organization_id,user_id,role) VALUES(?,?,?,'owner')").bind(crypto.randomUUID(),id,actorId),audit(db,actorId,id,'organization.create',id)]);
 return {data:parseRow(results[0].results[0]),error:null};
}
export async function createClassroom(db:D1Database,actorId:string,orgId:string,input:Record<string,unknown>) {
 const role=await organizationRole(db,actorId,orgId);if(!['owner','admin','teacher'].includes(role))throw new HttpError(403,'Classroom creation denied');
 const teacherId=role==='teacher'?actorId:input.teacherId?textValue(input.teacherId,'teacher'):actorId;
 const teacherRole=await organizationMemberRole(db,teacherId,orgId);if(!['owner','admin','teacher'].includes(teacherRole))throw new HttpError(400,'Teacher must belong to organization');
 const id=crypto.randomUUID(),name=textValue(input.name,'name',150),term=input.term==null?null:textValue(input.term,'term',150);
 // Both actor permission and target membership are rechecked by conditional INSERT.
 const result=await db.batch<Record<string,unknown>>([
 db.prepare(`INSERT INTO classrooms(id,organization_id,name,term) SELECT ?,?,?,? WHERE (${superuserSQL('?')} OR EXISTS(SELECT 1 FROM organization_members WHERE organization_id=? AND user_id=? AND role IN ('owner','admin','teacher'))) AND EXISTS(SELECT 1 FROM organization_members WHERE organization_id=? AND user_id=? AND role IN ('owner','admin','teacher')) RETURNING *`).bind(id,orgId,name,term,actorId,orgId,actorId,orgId,teacherId),
 db.prepare("INSERT INTO classroom_members(id,classroom_id,user_id,role) SELECT ?,id,?,'teacher' FROM classrooms WHERE id=?").bind(crypto.randomUUID(),teacherId,id),
 db.prepare("INSERT INTO audit_events(id,actor_id,organization_id,action,resource_id) SELECT ?,?,?,'classroom.create',id FROM classrooms WHERE id=?").bind(crypto.randomUUID(),actorId,orgId,id)]);
 if(!result[0].results.length)throw new HttpError(403,'Classroom creation denied');return {data:parseRow(result[0].results[0]),error:null};
}

export async function listOrganizations(db:D1Database,actorId:string) {
 const rows=(await db.prepare(`SELECT o.id,o.name,o.description,o.code,CASE WHEN ${superuserSQL('?')} THEN 'superuser' ELSE om.role END AS role FROM organizations o LEFT JOIN organization_members om ON om.organization_id=o.id AND om.user_id=? WHERE (om.id IS NOT NULL OR ${superuserSQL('?')}) ORDER BY o.name,o.id LIMIT 10001`).bind(actorId,actorId,actorId).all()).results;
 if(rows.length>10000)throw new HttpError(413,'Too many organizations to display');return {data:rows,error:null};
}
