import { HttpError } from './http';
/** Always evaluate the verified database identity, never a request-supplied email. */
export function superuserSQL(actorExpression: string): string {
 return `EXISTS(SELECT 1 FROM platform_admins pa JOIN user su ON lower(trim(su.email))=pa.email WHERE su.id=${actorExpression} AND su.emailVerified=1)`;
}
export async function isSuperuser(db:D1Database,actorId:string):Promise<boolean> {
 return Boolean(await db.prepare(`SELECT 1 AS allowed WHERE ${superuserSQL('?')}`).bind(actorId).first());
}
export type OrgRole = 'owner' | 'admin' | 'teacher' | 'student';
export async function organizationRole(db: D1Database, actorId: string, orgId: string): Promise<OrgRole> {
  const row = await db.prepare(`SELECT CASE WHEN ${superuserSQL('?')} THEN 'owner' ELSE om.role END AS role FROM organizations o LEFT JOIN organization_members om ON om.organization_id=o.id AND om.user_id=? WHERE o.id=?`).bind(actorId,actorId,orgId).first<{role:OrgRole|null}>();
  if (!row?.role) throw new HttpError(403, 'Organization access denied');
  return row.role;
}
export async function organizationMemberRole(db:D1Database,userId:string,orgId:string):Promise<OrgRole> {
 const row=await db.prepare('SELECT role FROM organization_members WHERE organization_id=? AND user_id=?').bind(orgId,userId).first<{role:OrgRole}>();
 if(!row)throw new HttpError(403,'User must belong to the organization');return row.role;
}
// Used both for reads and inside mutations, so removal/reassignment cannot race a checked permission.
export function classroomScope(alias = 'c', manage = false): string {
  return `EXISTS(SELECT 1 FROM user actor WHERE actor.id=? AND (${superuserSQL('actor.id')} OR EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id=${alias}.organization_id AND om.user_id=actor.id AND (om.role IN ('owner','admin') OR ${manage ? `om.role='teacher' AND EXISTS (SELECT 1 FROM classroom_members cm WHERE cm.classroom_id=${alias}.id AND cm.user_id=om.user_id AND cm.role='teacher')` : `om.role='teacher' OR EXISTS (SELECT 1 FROM classroom_members cm WHERE cm.classroom_id=${alias}.id AND cm.user_id=om.user_id)`}))))`;
}
export async function authorizeClassroom(db: D1Database, actorId: string, id: string, manage = false) {
 const row = await db.prepare(`SELECT c.* FROM classrooms c WHERE c.id=? AND ${classroomScope('c',manage)}`).bind(id,actorId).first<Record<string,unknown>>();
 if (!row) throw new HttpError(403, 'Classroom access denied'); return row;
}
export interface AuthorizedProgram { id:string; title:string; description:string|null; classroom_id:string; organization_id:string; status:string }
export async function authorizeProgram(db:D1Database,actorId:string,id:string,action:'read'|'manage'|'submit') {
 let scope=classroomScope('c',action==='manage');
 if(action==='submit') scope=`p.status='published' AND EXISTS(SELECT 1 FROM classroom_members cm JOIN organization_members om ON om.organization_id=c.organization_id AND om.user_id=cm.user_id WHERE cm.classroom_id=c.id AND cm.user_id=? AND cm.role='student')`;
 else if(action==='read') scope+=` AND (${superuserSQL('?')} OR p.status='published' OR EXISTS(SELECT 1 FROM organization_members x WHERE x.organization_id=c.organization_id AND x.user_id=? AND x.role IN ('owner','admin','teacher')))`;
 const args=action==='read'?[id,actorId,actorId,actorId]:[id,actorId];
 const row=await db.prepare(`SELECT p.*,c.organization_id FROM programs p JOIN classrooms c ON c.id=p.classroom_id WHERE p.id=? AND ${scope}`).bind(...args).first<AuthorizedProgram>();
 if(!row) throw new HttpError(403,'Program access denied'); return row;
}
