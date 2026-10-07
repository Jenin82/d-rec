import { HttpError } from './http';
import { audit } from './db';
export async function acceptInvites(db:D1Database,actor:{id:string;email:string;emailVerified:boolean}) {
 if(!actor.emailVerified)throw new HttpError(403,'Verify your email before accepting invitations');
 const email=actor.email.trim().toLowerCase();
 // All claims and deletions share one transaction. INSERT SELECT evaluates expiry in that transaction.
 const rank=`CASE role WHEN 'owner' THEN 4 WHEN 'admin' THEN 3 WHEN 'teacher' THEN 2 ELSE 1 END`;
 const org=db.prepare(`INSERT INTO organization_members(id,organization_id,user_id,role) SELECT lower(hex(randomblob(16))),organization_id,?,role FROM org_invites WHERE email=? AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') ON CONFLICT(organization_id,user_id) DO UPDATE SET role=CASE WHEN (${rank}) < (CASE excluded.role WHEN 'admin' THEN 3 WHEN 'teacher' THEN 2 ELSE 1 END) THEN excluded.role ELSE organization_members.role END`).bind(actor.id,email);
 const classOrg=db.prepare(`INSERT INTO organization_members(id,organization_id,user_id,role) SELECT DISTINCT lower(hex(randomblob(16))),c.organization_id,?,'student' FROM classroom_invites i JOIN classrooms c ON c.id=i.classroom_id WHERE i.email=? AND i.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') ON CONFLICT(organization_id,user_id) DO NOTHING`).bind(actor.id,email);
 const classMember=db.prepare(`INSERT INTO classroom_members(id,classroom_id,user_id,role) SELECT lower(hex(randomblob(16))),classroom_id,?,'student' FROM classroom_invites WHERE email=? AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') ON CONFLICT(classroom_id,user_id) DO NOTHING`).bind(actor.id,email);
 await db.batch([org,classOrg,classMember,db.prepare('DELETE FROM org_invites WHERE email=?').bind(email),db.prepare('DELETE FROM classroom_invites WHERE email=?').bind(email),audit(db,actor.id,null,'invites.accept',actor.id)]);
 return {data:{accepted:true},error:null};
}
