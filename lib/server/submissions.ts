import type { QueryRequest } from '@/types/resource';
import { HttpError } from './http';
import { authorizeProgram,classroomScope } from './authorization';
import { filters,scope } from './resources-query';
import { parseRow,audit } from './db';
export async function mutateSubmission(db:D1Database,actorId:string,table:string,q:QueryRequest) {
 if(!['insert','upsert','update'].includes(q.operation)||Array.isArray(q.values)||!q.values)throw new HttpError(400,'Invalid submission operation');
 const value={...q.values};const f=filters(table,q);
 const existing=q.operation==='update'?(await db.prepare(`SELECT t.* FROM ${table} t WHERE ${f.sql} AND ${scope(table,actorId).sql} LIMIT 2`).bind(...f.args,...scope(table,actorId).args).all<Record<string,unknown>>()).results:[];
 if(q.operation==='update'&&existing.length!==1)throw new HttpError(404,'Submission not found');
 const programId=String(existing[0]?.program_id||value.program_id||'');const studentId=String(existing[0]?.student_id||actorId);
 if(value.student_id&&value.student_id!==studentId)throw new HttpError(403,'Student identity cannot change');
 if(value.program_id&&value.program_id!==programId)throw new HttpError(400,'Program cannot change');
 const self=studentId===actorId;await authorizeProgram(db,actorId,programId,self?'submit':'manage');
 const current=existing[0]||await db.prepare(`SELECT * FROM ${table} WHERE program_id=? AND student_id=?`).bind(programId,studentId).first<Record<string,unknown>>();
 if(!self&&!current)throw new HttpError(404,'Submission not found');
 const expected=value.expectedVersion??q.expectedVersion;
 if(current&&(!Number.isInteger(expected)||expected!==current.version))throw new HttpError(409,'Submission changed. Reload before saving.','VERSION_CONFLICT');
 const allowed=self?(table==='algorithm_submissions'?['content','status','metadata']:['code','language','output','status','metadata']):['status','feedback'];
 if(Object.keys(value).some(k=>!allowed.includes(k)&&!['program_id','student_id','expectedVersion'].includes(k)))throw new HttpError(400,'Protected submission field');
 const status=String(value.status||current?.status||'draft');
 if(self){if(!['draft','pending'].includes(status))throw new HttpError(403,'Only a teacher can review submissions');if(current?.status==='approved'||current?.status==='pending')throw new HttpError(409,'Reopen reviewed or pending work before editing');}
 else {if(!['approved','rejected'].includes(status)||current?.status!=='pending')throw new HttpError(409,'Only pending work can be reviewed');}
 const data:Record<string,unknown>={};for(const key of allowed){if(value[key]!==undefined){const v=value[key];if(key==='metadata'){if(!v||typeof v!=='object'||Array.isArray(v)||JSON.stringify(v).length>10000)throw new HttpError(400,'Invalid metadata');const m=v as Record<string,unknown>;if(Object.keys(m).some(k=>!['custom_input','feedback'].includes(k))||m.custom_input!==undefined&&typeof m.custom_input!=='string'||self&&m.feedback!==undefined)throw new HttpError(400,'Invalid metadata fields');data.metadata=JSON.stringify(m);}else{if(v!==null&&typeof v!=='string'||typeof v==='string'&&v.length>50000)throw new HttpError(400,`Invalid ${key}`);data[key]=v;}}}
 data.status=status;
 if(self&&status==='pending'){const content=data[table==='algorithm_submissions'?'content':'code']??current?.[table==='algorithm_submissions'?'content':'code'];if(typeof content!=='string'||!content.trim())throw new HttpError(400,'Submission cannot be empty');}
 // Atomic prerequisite remains in mutation predicate so concurrent algorithm reopening cannot submit/approve code.
 const algorithmGate=table==='code_submissions'&&['pending','approved'].includes(status)?` AND EXISTS(SELECT 1 FROM algorithm_submissions a WHERE a.program_id=t.program_id AND a.student_id=t.student_id AND a.status='approved')`:'';
 const permission=self?`EXISTS(SELECT 1 FROM programs p JOIN classrooms c ON c.id=p.classroom_id JOIN classroom_members cm ON cm.classroom_id=c.id JOIN organization_members om ON om.organization_id=c.organization_id AND om.user_id=cm.user_id WHERE p.id=t.program_id AND p.status='published' AND cm.user_id=? AND cm.role='student')`:`EXISTS(SELECT 1 FROM programs p JOIN classrooms c ON c.id=p.classroom_id WHERE p.id=t.program_id AND ${classroomScope('c',true)})`;
 let stmt:D1PreparedStatement;
 if(current){if(!self){data.reviewer_id=actorId;data.reviewed_at=new Date().toISOString();if(table==='code_submissions'){let m:Record<string,unknown>={};try{m=JSON.parse(String(current.metadata));}catch{}m.feedback=value.feedback||null;data.metadata=JSON.stringify(m);}}
 stmt=db.prepare(`UPDATE ${table} AS t SET ${Object.keys(data).map(k=>`${k}=?`).join(',')},version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND version=? AND status ${self?"IN ('draft','rejected')":"='pending'"} AND ${permission}${algorithmGate} RETURNING *`).bind(...Object.values(data),current.id,expected,actorId);
 }else{data.id=crypto.randomUUID();data.program_id=programId;data.student_id=actorId;const keys=Object.keys(data);stmt=db.prepare(`INSERT INTO ${table} (${keys.join(',')}) SELECT ${keys.map(k=>`t.${k}`).join(',')} FROM (SELECT ${keys.map(k=>`? AS ${k}`).join(',')}) t WHERE ${permission}${algorithmGate} RETURNING *`).bind(...Object.values(data),actorId);}
 const results=await db.batch<Record<string,unknown>>([stmt]);const row=results[0].results[0];if(!row)throw new HttpError(409,'Submission changed or permission was removed','VERSION_CONFLICT');
 await audit(db,actorId,null,`${table}.${self?'save':'review'}`,String(row.id)).run();
 return {data:q.returning?(q.single?parseRow(row):[parseRow(row)]):null,error:null};
}
export async function reopenProgram(db:D1Database,actorId:string,programId:string,body:Record<string,unknown>) {
 const studentId=String(body.studentId||actorId);const program=await authorizeProgram(db,actorId,programId,studentId===actorId?'submit':'manage');
 const permission=studentId===actorId?`EXISTS(SELECT 1 FROM classroom_members cm JOIN organization_members om ON om.user_id=cm.user_id WHERE cm.classroom_id=? AND cm.user_id=? AND cm.role='student' AND om.organization_id=?)`:`EXISTS(SELECT 1 FROM classrooms c WHERE c.id=? AND ${classroomScope('c',true)})`;
 const args=studentId===actorId?[program.classroom_id,actorId,program.organization_id]:[program.classroom_id,actorId];
 if(!Number.isInteger(body.algorithmVersion)||!Number.isInteger(body.codeVersion))throw new HttpError(400,'Submission versions are required');
 const guardId=crypto.randomUUID();
 const check=db.prepare(`INSERT INTO mutation_guards(id,allowed) SELECT ?,CASE WHEN ${permission} AND coalesce((SELECT version FROM algorithm_submissions WHERE program_id=? AND student_id=?),0)=? AND coalesce((SELECT version FROM code_submissions WHERE program_id=? AND student_id=?),0)=? THEN 1 ELSE 0 END`).bind(guardId,...args,programId,studentId,body.algorithmVersion,programId,studentId,body.codeVersion);
 const updates=['algorithm_submissions','code_submissions'].map(table=>db.prepare(`UPDATE ${table} SET status='draft',feedback=NULL,reviewer_id=NULL,reviewed_at=NULL,metadata=json_remove(metadata,'$.feedback'),version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE program_id=? AND student_id=? AND ${permission}`).bind(programId,studentId,...args));
 let result:D1Result<unknown>[];
 try{result=await db.batch([check,...updates,db.prepare('DELETE FROM mutation_guards WHERE id=?').bind(guardId),audit(db,actorId,program.organization_id,'submission.reopen',programId)]);}catch(error){if(error instanceof Error&&error.message.includes('allowed'))throw new HttpError(409,'Submission changed or permission was removed','VERSION_CONFLICT');throw error;}
 if(!result[1].meta.changes&&!result[2].meta.changes)throw new HttpError(409,'No work to reopen');return {data:{reopened:true},error:null};
}
