import type { QueryRequest } from '@/types/resource';
import { filters,scope } from './resources-query';
import { HttpError,textValue } from './http';
import { parseRow,audit } from './db';
import { authorizeClassroom,organizationRole,organizationMemberRole,superuserSQL } from './authorization';
import { mutateSubmission } from './submissions';
const writable:Record<string,string[]>={profiles:['full_name','display_name','phone','bio'],organizations:['name','description','code'],classrooms:['name','term'],programs:['classroom_id','title','description','status','metadata'],org_invites:['organization_id','email','role'],classroom_invites:['classroom_id','email'],classroom_members:['classroom_id','user_id','role']};
export async function mutateResource(db:D1Database,actorId:string,table:string,q:QueryRequest):Promise<{data:unknown;error:null}> {
 if(table.endsWith('_submissions'))return mutateSubmission(db,actorId,table,q);
 if(table==='profiles'&&q.operation!=='update')throw new HttpError(403,'Only own profile edits are allowed');
 if(q.operation==='upsert')throw new HttpError(400,'Use the explicit creation operation');
 if(table==='organizations'&&q.operation==='insert')throw new HttpError(400,'Use /api/organizations');
 if(table==='classrooms'&&q.operation==='insert')throw new HttpError(400,'Use organization classroom creation');
 const f=filters(table,q);if(['update','delete'].includes(q.operation)&&!q.filters.some(x=>x.operator==='eq'&&x.column==='id'||x.operator==='eq'&&['user_id','classroom_id','organization_id'].includes(x.column)))throw new HttpError(400,'A scoped filter is required');
 const permission=scope(table,actorId,true);
 if(q.operation==='delete') {
  if(!['org_invites','classroom_invites','organization_members','classroom_members','programs','classrooms'].includes(table))throw new HttpError(403,'Deletion not allowed');
  let protection=''; const extra:unknown[]=[];
  if(table==='organization_members'){protection=` AND t.role!='owner' AND (t.role!='admin' OR ${superuserSQL('?')} OR EXISTS(SELECT 1 FROM organization_members owner WHERE owner.organization_id=t.organization_id AND owner.user_id=? AND owner.role='owner'))`;extra.push(actorId,actorId);}
  if(table==='classroom_members'){protection+=` AND (t.role='student' OR ${superuserSQL('?')} OR EXISTS(SELECT 1 FROM classrooms c JOIN organization_members om ON om.organization_id=c.organization_id WHERE c.id=t.classroom_id AND om.user_id=? AND om.role IN ('owner','admin')))`;extra.push(actorId,actorId);}
  const predicate = `${f.sql} AND ${permission.sql}${protection}`;
  const arguments_ = [...f.args, ...permission.args, ...extra];
  const eligible = (await db.prepare(`SELECT t.* FROM ${table} t WHERE ${predicate} LIMIT 5001`).bind(...arguments_).all<Record<string, unknown>>()).results;
  if (!eligible.length) throw new HttpError(403, 'No permitted resource to remove');
  if (eligible.length > 5000) throw new HttpError(413, 'Narrow the deletion to fewer resources');
  const guardId = crypto.randomUUID();
  const statements = [
    db.prepare(`DELETE FROM ${table} AS t WHERE ${predicate} RETURNING *`).bind(...arguments_),
    db.prepare('INSERT INTO mutation_guards(id,allowed) VALUES(?,changes()=?)').bind(guardId, eligible.length),
  ];
  if (table === 'organization_members') {
    const removed = JSON.stringify(eligible.map(row => ({user_id:row.user_id, organization_id:row.organization_id})));
    statements.push(db.prepare(`DELETE FROM classroom_members AS cm WHERE NOT EXISTS(SELECT 1 FROM organization_members om JOIN classrooms c ON c.organization_id=om.organization_id WHERE c.id=cm.classroom_id AND om.user_id=cm.user_id) AND EXISTS(SELECT 1 FROM classrooms c,json_each(?) r WHERE c.id=cm.classroom_id AND c.organization_id=json_extract(r.value,'$.organization_id') AND cm.user_id=json_extract(r.value,'$.user_id'))`).bind(removed));
  }
  statements.push(...eligible.map(row => audit(db,actorId,String(row.organization_id||'')||null,`${table}.delete`,String(row.id))));
  statements.push(db.prepare('DELETE FROM mutation_guards WHERE id=?').bind(guardId));
  let results: D1Result<Record<string, unknown>>[];
  try { results = await db.batch<Record<string, unknown>>(statements); }
  catch (error) {
    if (error instanceof Error && error.message.includes('allowed')) throw new HttpError(409,'Membership changed. Reload before removing it.');
    throw error;
  }
  return {data:q.returning?results[0].results.map(parseRow):null,error:null};
 }
 const list=Array.isArray(q.values)?q.values:[q.values];if(!list.length||list.length>100||list.some(v=>!v||typeof v!=='object'))throw new HttpError(400,'Invalid values');
 if(q.operation==='update'&&list.length!==1)throw new HttpError(400,'Invalid update');
 const statements:D1PreparedStatement[]=[];const guardIds:string[]=[];
 for(const supplied of list){const raw={...supplied};delete raw.invited_by;delete raw.student_id;
  if(!writable[table])throw new HttpError(403,'Mutation not allowed');
  if(Object.keys(raw).some(k=>!writable[table].includes(k)))throw new HttpError(400,'Protected or unknown field');
  const values:Record<string,unknown>={};for(const [key,value]of Object.entries(raw)){if(key==='metadata'){if(!value||typeof value!=='object'||Array.isArray(value))throw new HttpError(400,'Invalid metadata');values[key]=JSON.stringify(value);}else {if(value!==null&&typeof value!=='string')throw new HttpError(400,`Invalid ${key}`);if(typeof value==='string'&&value.length>20000)throw new HttpError(400,`Invalid ${key}`);values[key]=value;}}
  if(q.operation==='insert'){
   const id=crypto.randomUUID();values.id=id;
   if(table==='programs'){await authorizeClassroom(db,actorId,textValue(values.classroom_id,'classroom'),true);textValue(values.title,'title',300);if(values.status&&!['draft','published'].includes(String(values.status)))throw new HttpError(400,'Invalid status');}
   if(table==='org_invites'){const role=await organizationRole(db,actorId,textValue(values.organization_id,'organization'));if(!['owner','admin'].includes(role)||values.role==='admin'&&role!=='owner')throw new HttpError(403,'Invite access denied');if(!['admin','teacher','student'].includes(String(values.role)))throw new HttpError(400,'Invalid role');}
   if(table==='classroom_invites')await authorizeClassroom(db,actorId,textValue(values.classroom_id,'classroom'),true);
   if(table.endsWith('_invites')){values.email=textValue(values.email,'email',254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.email)))throw new HttpError(400,'Invalid email');values.invited_by=actorId;values.expires_at=new Date(Date.now()+7*86400000).toISOString();}
   if(table==='classroom_members'){const c=await authorizeClassroom(db,actorId,textValue(values.classroom_id,'classroom'),true);const admin=await organizationRole(db,actorId,String(c.organization_id));if(!['owner','admin'].includes(admin))throw new HttpError(403,'Only administrators assign members');const role=await organizationMemberRole(db,textValue(values.user_id,'user'),String(c.organization_id));if(values.role==='teacher'&&!['teacher','admin','owner'].includes(role)||!['teacher','student'].includes(String(values.role)))throw new HttpError(400,'Invalid classroom role');}
   const insertScope=scope(table,actorId,true);
   if(table==='org_invites'&&values.role==='admin'){insertScope.sql+=` AND (${superuserSQL('?')} OR EXISTS(SELECT 1 FROM organization_members om WHERE om.organization_id=t.organization_id AND om.user_id=? AND om.role='owner'))`;insertScope.args.push(actorId,actorId);}
   if(table==='classroom_members'){insertScope.sql+=` AND (${superuserSQL('?')} OR EXISTS(SELECT 1 FROM classrooms c JOIN organization_members om ON om.organization_id=c.organization_id WHERE c.id=t.classroom_id AND om.user_id=? AND om.role IN ('owner','admin'))) AND EXISTS(SELECT 1 FROM classrooms c JOIN organization_members target ON target.organization_id=c.organization_id WHERE c.id=t.classroom_id AND target.user_id=t.user_id AND (t.role='student' OR target.role IN ('owner','admin','teacher')))`;insertScope.args.push(actorId,actorId);}
   const keys=Object.keys(values);const virtual=keys.map(k=>`? AS ${k}`).join(',');
   statements.push(db.prepare(`INSERT INTO ${table} (${keys.join(',')}) SELECT ${keys.map(k=>`t.${k}`).join(',')} FROM (SELECT ${virtual}) t WHERE ${insertScope.sql} RETURNING *`).bind(...Object.values(values),...insertScope.args));
   const guardId=crypto.randomUUID();guardIds.push(guardId);
   statements.push(db.prepare(`INSERT INTO mutation_guards(id,allowed) SELECT ?,EXISTS(SELECT 1 FROM ${table} WHERE id=?)`).bind(guardId,id));
  }else if(q.operation==='update') {
   if(['org_invites','classroom_invites','classroom_members'].includes(table))throw new HttpError(403,'Replace the invitation or membership instead');
   delete values.classroom_id; if(!Object.keys(values).length)throw new HttpError(400,'No changes');
   statements.push(db.prepare(`UPDATE ${table} AS t SET ${Object.keys(values).map(k=>`${k}=?`).join(',')},updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE ${f.sql} AND ${permission.sql} RETURNING *`).bind(...Object.values(values),...f.args,...permission.args));
  }else throw new HttpError(400,'Invalid operation');
 }
 if(guardIds.length)statements.push(db.prepare(`DELETE FROM mutation_guards WHERE id IN (${guardIds.map(()=>'?').join(',')})`).bind(...guardIds));
 let results:D1Result<Record<string,unknown>>[];
 try{results=await db.batch<Record<string,unknown>>(statements);}catch(error){if(error instanceof Error&&error.message.includes('allowed'))throw new HttpError(403,'Mutation permission changed');throw error;}
 const rows=results.flatMap(r=>r.results);if(!rows.length)throw new HttpError(403,'Mutation denied');
 await db.batch(rows.map(r=>audit(db,actorId,String(r.organization_id||'')||null,`${table}.${q.operation}`,String(r.id))));
 return {data:q.returning?(q.single?parseRow(rows[0]):rows.map(parseRow)):null,error:null};
}
