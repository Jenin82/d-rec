import { HttpError } from './http';
import { classroomScope,superuserSQL } from './authorization';
import type { QueryRequest } from '@/types/resource';
export const columns: Record<string,string[]> = {
 profiles:['id','full_name','display_name','phone','bio','avatar_url','role','metadata','created_at','updated_at'],
 organizations:['id','name','description','code','metadata','created_at','updated_at'],
 organization_members:['id','organization_id','user_id','role','created_at'],
 classrooms:['id','organization_id','name','term','metadata','created_at','updated_at'],
 classroom_members:['id','classroom_id','user_id','role','created_at'],
 programs:['id','classroom_id','title','description','status','metadata','created_at','updated_at'],
 org_invites:['id','organization_id','email','role','invited_by','created_at','expires_at'],
 classroom_invites:['id','classroom_id','email','invited_by','created_at','expires_at'],
 algorithm_submissions:['id','program_id','student_id','content','status','feedback','metadata','version','created_at','updated_at'],
 code_submissions:['id','program_id','student_id','code','language','output','status','feedback','metadata','version','created_at','updated_at'],
};
export function scope(table:string,actor:string,manage=false): {sql:string,args:unknown[]} {
 const permission=memberScope(table,actor,manage);
 if(table==='profiles'&&manage)return permission;
 return {sql:`(${permission.sql} OR ${superuserSQL('?')})`,args:[...permission.args,actor]};
}
function memberScope(table:string,actor:string,manage=false): {sql:string,args:unknown[]} {
 const org=(field:string)=>`EXISTS(SELECT 1 FROM organization_members om WHERE om.organization_id=${field} AND om.user_id=? ${manage?"AND om.role IN ('owner','admin')":''})`;
 if(table==='profiles') return {sql:manage?'t.id=?':`(t.id=? OR EXISTS(SELECT 1 FROM organization_members peer JOIN organization_members me ON peer.organization_id=me.organization_id WHERE peer.user_id=t.id AND me.user_id=? AND me.role IN ('owner','admin','teacher')))`,args:manage?[actor]:[actor,actor]};
 if(table==='organizations') return {sql:org('t.id'),args:[actor]};
 if(table==='organization_members') return {sql:manage?org('t.organization_id'):`(t.user_id=? OR ${org('t.organization_id')})`,args:manage?[actor]:[actor,actor]};
 if(table==='org_invites') return {sql:`EXISTS(SELECT 1 FROM organization_members om WHERE om.organization_id=t.organization_id AND om.user_id=? AND om.role IN ('owner','admin'))`,args:[actor]};
 if(table==='classrooms') return {sql:classroomScope('t',manage),args:[actor]};
 if(['classroom_members','classroom_invites','programs'].includes(table)) {
  let sql=`EXISTS(SELECT 1 FROM classrooms c WHERE c.id=t.classroom_id AND ${classroomScope('c', manage || table==='classroom_invites')})`;
  if(table==='programs'&&!manage) {sql+=` AND (t.status='published' OR EXISTS(SELECT 1 FROM classrooms c JOIN organization_members om ON om.organization_id=c.organization_id WHERE c.id=t.classroom_id AND om.user_id=? AND om.role IN ('owner','admin','teacher')))`;return {sql,args:[actor,actor]};}
  return {sql,args:[actor]};
 }
 if(table.endsWith('_submissions')) return {sql:`EXISTS(SELECT 1 FROM programs p JOIN classrooms c ON c.id=p.classroom_id WHERE p.id=t.program_id AND ((t.student_id=? AND p.status='published' AND EXISTS(SELECT 1 FROM classroom_members cm JOIN organization_members om ON om.organization_id=c.organization_id AND om.user_id=cm.user_id WHERE cm.classroom_id=c.id AND cm.user_id=t.student_id AND cm.role='student')) OR ${classroomScope('c',true)}))`,args:[actor,actor]};
 throw new HttpError(400,'Unknown resource');
}
export function filters(table:string,q:QueryRequest):{sql:string,args:unknown[]} {
 if(!Array.isArray(q.filters)||q.filters.length>20) throw new HttpError(400,'Invalid filters');
 const parts:string[]=[];const args:unknown[]=[];
 for(const f of q.filters){
  if(!f || typeof f !== 'object') throw new HttpError(400,'Invalid filter');
  if(table==='profiles' && ['phone','bio','metadata','avatar_url'].includes(f.column)) throw new HttpError(400,'Private profile fields cannot be filtered');
  if(!columns[table].includes(f.column)) {
    if(table==='classrooms'&&f.column==='classroom_members.user_id'&&f.operator==='eq'&&typeof f.value==='string'){parts.push('EXISTS(SELECT 1 FROM classroom_members j WHERE j.classroom_id=t.id AND j.user_id=?)');args.push(f.value);continue;}
    throw new HttpError(400,'Invalid filter column');
  }
  if(f.operator==='in'){if(!Array.isArray(f.value)||f.value.length>10000||f.value.some(v=>typeof v!=='string'&&typeof v!=='number'))throw new HttpError(400,'Invalid list');parts.push(`t.${f.column} IN (SELECT value FROM json_each(?))`);args.push(JSON.stringify(f.value));}
  else if(f.operator==='is'&&f.value===null)parts.push(`t.${f.column} IS NULL`);
  else if(['eq','neq'].includes(f.operator)&&['string','number','boolean'].includes(typeof f.value)){parts.push(`t.${f.column} ${f.operator==='eq'?'=':'!='} ?`);args.push(f.value);}
  else throw new HttpError(400,'Invalid filter');
 }
 return {sql:parts.length?parts.join(' AND '):'1',args};
}
export function selection(table:string,input:string) {
 const s=(input||'*').replace(/\s+/g,'');
 const joins:Record<string,string[]>={organization_members:['organizations','profiles'],classroom_members:['classrooms'],classrooms:['classroom_members']};
 const join=(joins[table]||[]).find(name=>s.includes(name+'(')||s.includes(name+'!inner('));let joinColumns:string[]=[];
 let plain=s;
 if(join){const pattern=new RegExp(`,?${join}(?:!inner)?\\(([^()]*)\\)`);const m=s.match(pattern);if(m){joinColumns=m[1].split(',');if(joinColumns.some(c=>!columns[join].includes(c)))throw new HttpError(400,'Invalid join columns');plain=s.replace(pattern,'').replace(/^,|,$/g,'');}}
 const selected=plain==='*'||!plain?columns[table]:plain.split(',');if(selected.some(c=>!columns[table].includes(c)))throw new HttpError(400,'Invalid selection');
 return {selected,join:joinColumns.length?join:null,joinColumns};
}
