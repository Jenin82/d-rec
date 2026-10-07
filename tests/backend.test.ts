import { afterEach,describe,expect,it } from 'vitest';
import { seededDatabase,testDatabase } from './d1-test-helper';
import { queryResource } from '../lib/server/resources';
import { filters } from '../lib/server/resources-query';
import { authorizeProgram } from '../lib/server/authorization';
import { createOrganization,createClassroom } from '../lib/server/organizations';
import { acceptInvites } from '../lib/server/invites';
import { reopenProgram } from '../lib/server/submissions';
import { assertSameOrigin,readJson } from '../lib/server/http';
import type { QueryRequest } from '../types/resource';
const fixtures:ReturnType<typeof testDatabase>[]=[];
afterEach(()=>{for(const fixture of fixtures.splice(0))fixture.close();});
async function setup(){const f=await seededDatabase();fixtures.push(f);return f.db;}
const select=(filters:QueryRequest['filters']=[],columns='*'):QueryRequest=>({operation:'select',columns,filters});
const eq=(column:string,value:string)=>({column,operator:'eq' as const,value});
const insert=(values:Record<string,unknown>|Record<string,unknown>[]):QueryRequest=>({operation:'insert',columns:'*',filters:[],values,returning:true,single:'single'});
const update=(id:string,values:Record<string,unknown>):QueryRequest=>({operation:'update',columns:'*',filters:[eq('id',id)],values,returning:true,single:'single'});
async function saveAlgorithm(db:D1Database,status='pending') {const result=await queryResource(db,'student','algorithm_submissions',insert({program_id:'program',student_id:'student',content:'Algorithm steps',status}));return result.data as Record<string,unknown>;}
async function approveAlgorithm(db:D1Database){const row=await saveAlgorithm(db);const result=await queryResource(db,'teacher','algorithm_submissions',update(String(row.id),{status:'approved',expectedVersion:1,feedback:'Good'}));return result.data as Record<string,unknown>;}
describe('Fresh D1 schema and tenant authorization',()=>{
 it('creates an empty database without importing records',async()=>{const f=testDatabase();fixtures.push(f);expect(await f.db.prepare('SELECT count(*) n FROM organizations').first('n')).toBe(0);expect(await f.db.prepare('SELECT count(*) n FROM user').first('n')).toBe(0);});
 it('scopes classrooms and programs in SQL even for arbitrary bulk ids',async()=>{const db=await setup();const result=await queryResource(db,'student','programs',select([{column:'id',operator:'in',value:['program','program2','privateprogram','draftprogram']}]));expect((result.data as {id:string}[]).map(r=>r.id)).toEqual(['program']);const teacher=await queryResource(db,'teacher','classrooms',select());expect((teacher.data as {id:string}[]).map(r=>r.id).sort()).toEqual(['class','class2']);await expect(authorizeProgram(db,'teacher','program2','manage')).rejects.toMatchObject({status:403});await expect(authorizeProgram(db,'outsider','program','read')).rejects.toMatchObject({status:403});});
 it('returns private profile fields only to self and no avatar object keys',async()=>{const db=await setup();await db.prepare("UPDATE profiles SET avatar_key='avatar-object' WHERE id='student'").run();const self=await queryResource(db,'student','profiles',select([eq('id','student')]));expect((self.data as Record<string,unknown>[])[0]).toMatchObject({phone:'private-phone',avatar_url:'/api/profile/avatar'});const peer=await queryResource(db,'teacher','profiles',select([eq('id','student')]));expect((peer.data as Record<string,unknown>[])[0]).toMatchObject({phone:null,bio:null,metadata:null,avatar_url:null});expect((peer.data as Record<string,unknown>[])[0]).not.toHaveProperty('avatar_key');const nested=await queryResource(db,'teacher','organization_members',select([eq('user_id','student')],'user_id,profiles(full_name,phone)'));expect((nested.data as Record<string,unknown>[])[0].profiles).toEqual({full_name:'student',phone:null});});
 it('rejects unknown fields, arbitrary SQL and profile role escalation',async()=>{const db=await setup();await expect(queryResource(db,'student','programs',select([eq('id; DROP TABLE user','program')]))).rejects.toMatchObject({status:400});await expect(queryResource(db,'student','profiles',update('student',{role:'owner'}))).rejects.toMatchObject({status:400});await expect(queryResource(db,'owner','user',select())).rejects.toMatchObject({status:400});await expect(queryResource(db,'owner','profiles',select([], 'id,password'))).rejects.toMatchObject({status:400});});
 it('creates organizations and classrooms with their memberships atomically',async()=>{const db=await setup();const organization=await createOrganization(db,'student',{name:'My organization'});const id=String(organization.data.id);expect(await db.prepare('SELECT role FROM organization_members WHERE organization_id=? AND user_id=?').bind(id,'student').first('role')).toBe('owner');const room=await createClassroom(db,'teacher','org',{name:'New class',teacherId:'outsider'});expect(await db.prepare('SELECT user_id FROM classroom_members WHERE classroom_id=?').bind(room.data.id).first('user_id')).toBe('teacher');await expect(createClassroom(db,'student','org',{name:'Denied'})).rejects.toMatchObject({status:403});await expect(createClassroom(db,'owner','org',{name:'Denied',teacherId:'outsider'})).rejects.toMatchObject({status:403});});
 it('protects owners and only owners remove admins',async()=>{const db=await setup();const del=(user:string):QueryRequest=>({operation:'delete',columns:'*',filters:[eq('organization_id','org'),eq('user_id',user)]});await expect(queryResource(db,'owner','organization_members',del('owner'))).rejects.toMatchObject({status:403});await expect(queryResource(db,'admin','organization_members',del('admin'))).rejects.toMatchObject({status:403});await queryResource(db,'owner','organization_members',del('admin'));expect(await db.prepare("SELECT id FROM organization_members WHERE user_id='admin'").first()).toBeNull();});
 it('prevents teacher reassignment and cross-organization membership assignment',async()=>{const db=await setup();await expect(queryResource(db,'teacher','classroom_members',insert({classroom_id:'class',user_id:'student2',role:'student'}))).rejects.toMatchObject({status:403});await expect(queryResource(db,'owner','classroom_members',insert({classroom_id:'class',user_id:'outsider',role:'student'}))).rejects.toMatchObject({status:403});await expect(queryResource(db,'teacher','programs',insert({classroom_id:'class2',title:'Forbidden'}))).rejects.toMatchObject({status:403});});
});
describe('Verified invitation claims',()=>{
 it('normalizes email, preserves stronger roles, is idempotent and respects expiration',async()=>{const db=await setup();await queryResource(db,'owner','org_invites',insert({organization_id:'org',email:' ADMIN@Example.Com ',role:'student'}));await queryResource(db,'teacher','classroom_invites',insert({classroom_id:'class',email:'ADMIN@example.com'}));await expect(acceptInvites(db,{id:'admin',email:'admin@example.com',emailVerified:false})).rejects.toMatchObject({status:403});await acceptInvites(db,{id:'admin',email:'ADMIN@EXAMPLE.COM',emailVerified:true});await acceptInvites(db,{id:'admin',email:'admin@example.com',emailVerified:true});expect(await db.prepare("SELECT role FROM organization_members WHERE user_id='admin' AND organization_id='org'").first('role')).toBe('admin');expect(await db.prepare("SELECT count(*) n FROM classroom_members WHERE user_id='admin' AND classroom_id='class'").first('n')).toBe(1);await db.prepare("INSERT INTO org_invites(id,organization_id,email,role,invited_by,expires_at) VALUES('expired','org','outsider@example.com','teacher','owner','2000-01-01T00:00:00Z')").run();await acceptInvites(db,{id:'outsider',email:'outsider@example.com',emailVerified:true});expect(await db.prepare("SELECT id FROM organization_members WHERE user_id='outsider' AND organization_id='org'").first()).toBeNull();});
 it('rolls back all invitation inserts when assignment changes after prechecks',async()=>{
 const db=await setup();await db.prepare("INSERT INTO classroom_members(id,classroom_id,user_id,role) VALUES('cm-teacher-second','class2','teacher','teacher')").run();
 const batch=db.batch.bind(db);let intercepted=false;
 const racing={prepare:db.prepare.bind(db),batch:async(statements:D1PreparedStatement[])=>{if(!intercepted){intercepted=true;await db.prepare("DELETE FROM classroom_members WHERE id='cm-teacher-second'").run();}return batch(statements);}} as D1Database;
 await expect(queryResource(racing,'teacher','classroom_invites',insert([{classroom_id:'class',email:'first@example.com'},{classroom_id:'class2',email:'second@example.com'}]))).rejects.toMatchObject({status:403});
 expect(await db.prepare('SELECT count(*) n FROM classroom_invites').first('n')).toBe(0);
 expect(await db.prepare('SELECT count(*) n FROM mutation_guards').first('n')).toBe(0);
 });
 it('only owners can invite admins',async()=>{const db=await setup();await expect(queryResource(db,'admin','org_invites',insert({organization_id:'org',email:'new@example.com',role:'admin'}))).rejects.toMatchObject({status:403});});
});
describe('Versioned student submission and teacher reviews',()=>{
 it('rejects student forged approval and forged student ids',async()=>{const db=await setup();await expect(saveAlgorithm(db,'approved')).rejects.toMatchObject({status:403});await expect(queryResource(db,'student','algorithm_submissions',insert({program_id:'program',student_id:'student2',content:'Forged',status:'draft'}))).rejects.toMatchObject({status:403});await expect(queryResource(db,'student','algorithm_submissions',insert({program_id:'program2',student_id:'student',content:'Forged',status:'draft'}))).rejects.toMatchObject({status:403});});
 it('requires the assigned teacher, current version and pending state for review',async()=>{const db=await setup();const row=await saveAlgorithm(db);await expect(queryResource(db,'teacher2','algorithm_submissions',update(String(row.id),{status:'approved',expectedVersion:1}))).rejects.toMatchObject({status:404});await expect(queryResource(db,'teacher','algorithm_submissions',update(String(row.id),{status:'approved',expectedVersion:0}))).rejects.toMatchObject({status:409});await queryResource(db,'teacher','algorithm_submissions',update(String(row.id),{status:'approved',expectedVersion:1}));await expect(queryResource(db,'student','algorithm_submissions',update(String(row.id),{content:'Changed after approval',status:'draft',expectedVersion:2}))).rejects.toMatchObject({status:409});});
 it('gates code submission on approved algorithm then atomically reopens both',async()=>{const db=await setup();await expect(queryResource(db,'student','code_submissions',insert({program_id:'program',code:'print(1)',language:'python',status:'pending'}))).rejects.toMatchObject({status:409});const algorithm=await approveAlgorithm(db);const saved=await queryResource(db,'student','code_submissions',insert({program_id:'program',code:'print(1)',language:'python',status:'pending'}));const code=saved.data as Record<string,unknown>;await queryResource(db,'teacher','code_submissions',update(String(code.id),{status:'approved',feedback:'Done',expectedVersion:1}));await expect(reopenProgram(db,'student','program',{algorithmVersion:1,codeVersion:2})).rejects.toMatchObject({status:409});expect(await db.prepare('SELECT status FROM algorithm_submissions WHERE id=?').bind(algorithm.id).first('status')).toBe('approved');await reopenProgram(db,'student','program',{algorithmVersion:2,codeVersion:2});expect(await db.prepare('SELECT status FROM algorithm_submissions WHERE id=?').bind(algorithm.id).first('status')).toBe('draft');expect(await db.prepare('SELECT status FROM code_submissions WHERE id=?').bind(code.id).first('status')).toBe('draft');});
});
describe('Request boundaries',()=>{
 it('rejects browser cross-origin mutations and streamed oversized JSON',async()=>{expect(()=>assertSameOrigin(new Request('https://app.example/api/resources/profiles',{method:'POST',headers:{origin:'https://evil.example'}}))).toThrow('Cross-origin');const req=new Request('https://app.example/api',{method:'POST',body:JSON.stringify({text:'a'.repeat(100)})});await expect(readJson(req,50)).rejects.toMatchObject({status:413});});
});

describe('Pagination and private profile query regressions',()=>{
 it('returns all 501 matching programs in stable pages with an explicit offset and a total count',async()=>{
  const db=await setup();const ids=Array.from({length:501},(_,i)=>`bulk-${String(i).padStart(4,'0')}`);
  await db.batch(ids.map(id=>db.prepare("INSERT INTO programs(id,classroom_id,title,status) VALUES(?,'class','Same title','published')").bind(id)));
  const request:QueryRequest={...select([{column:'id',operator:'in',value:ids}],'id,title'),count:true,order:{column:'title',ascending:true},limit:500};
  const first=await queryResource(db,'teacher','programs',{...request,offset:0});
  const second=await queryResource(db,'teacher','programs',{...request,offset:500});
  expect('count' in first && first.count).toBe(501);expect('count' in second && second.count).toBe(501);
  const firstIds=(first.data as {id:string}[]).map(row=>row.id),secondIds=(second.data as {id:string}[]).map(row=>row.id);
  expect(firstIds).toEqual(ids.slice(0,500));expect(secondIds).toEqual(ids.slice(500));
  expect(new Set([...firstIds,...secondIds]).size).toBe(501);
  const defaultOrder=await queryResource(db,'teacher','programs',{...request,order:undefined,offset:499,limit:3});
  expect((defaultOrder.data as {id:string}[]).map(row=>row.id)).toEqual(ids.slice(499));
  await expect(queryResource(db,'teacher','programs',{...request,offset:-1})).rejects.toMatchObject({status:400});
  await expect(queryResource(db,'teacher','programs',{...request,offset:0.5})).rejects.toMatchObject({status:400});
 });
 it('reports oversized nested classroom member lists and provides complete standalone pages',async()=>{
  const db=await setup();const users=Array.from({length:499},(_,i)=>`class-user-${String(i).padStart(4,'0')}`);
  await db.batch(users.flatMap(id=>[
   db.prepare('INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,1,0,0)').bind(id,id,`${id}@example.com`),
   db.prepare('INSERT INTO profiles(id,full_name) VALUES(?,?)').bind(id,id),
   db.prepare("INSERT INTO organization_members(id,organization_id,user_id,role) VALUES(?,'org',?,'student')").bind(`org-${id}`,id),
   db.prepare("INSERT INTO classroom_members(id,classroom_id,user_id,role) VALUES(?,'class',?,'student')").bind(`member-${id}`,id),
  ]));
  await expect(queryResource(db,'teacher','classrooms',select([eq('id','class')],'id,classroom_members(user_id)'))).rejects.toMatchObject({status:413,code:'NESTED_RESULT_TOO_LARGE',message:expect.stringContaining('paginated classroom_members')});
  const request={...select([eq('classroom_id','class')],'user_id'),limit:500};
  const first=await queryResource(db,'teacher','classroom_members',{...request,offset:0});
  const second=await queryResource(db,'teacher','classroom_members',{...request,offset:500});
  const members=[...(first.data as {user_id:string}[]),...(second.data as {user_id:string}[])];
  expect(members).toHaveLength(501);expect(new Set(members.map(row=>row.user_id)).size).toBe(501);
  await db.prepare('DELETE FROM classroom_members WHERE user_id=?').bind(users[0]).run();
  const atLimit=await queryResource(db,'teacher','classrooms',select([eq('id','class')],'id,classroom_members(user_id)'));
  expect((atLimit.data as {classroom_members:unknown[]}[])[0].classroom_members).toHaveLength(500);
 });
 it('uses one JSON bind for a 500-id IN filter and executes it with tenant isolation',async()=>{
  const db=await setup();const ids=['program','program2','privateprogram',...Array.from({length:497},(_,i)=>`missing-${i}`)];
  const request=select([{column:'id',operator:'in',value:ids}],'id');
  const built=filters('programs',request);
  expect(built.sql).toBe('t.id IN (SELECT value FROM json_each(?))');
  expect(built.args).toEqual([JSON.stringify(ids)]);
  const result=await queryResource(db,'student','programs',request);
  expect(result.data).toEqual([{id:'program'}]);
  const empty=await queryResource(db,'student','programs',select([{column:'id',operator:'in',value:[]}],'id'));
  expect(empty.data).toEqual([]);
 });
 it('rejects private profile filters and orders before they can act as count or ordering oracles',async()=>{
  const db=await setup();
  for(const field of ['phone','bio','metadata','avatar_url']){
   for(const operator of ['eq','neq','in','is'] as const){
    const value=operator==='is'?null:operator==='in'?['private-phone']:'private-phone';
    await expect(queryResource(db,'teacher','profiles',{...select([{column:field,operator,value}],'id'),count:true,head:true})).rejects.toMatchObject({status:400});
   }
   await expect(queryResource(db,'teacher','profiles',{...select([],'id'),order:{column:field,ascending:true},count:true})).rejects.toMatchObject({status:400});
  }
  const allowed=await queryResource(db,'teacher','profiles',{...select([eq('full_name','student')],'id'),count:true,head:true});
  expect(allowed).toMatchObject({data:null,count:1});
 });
});
describe('Transactional membership deletion regressions',()=>{
 const deleteStudents:QueryRequest={operation:'delete',columns:'*',filters:[eq('organization_id','org'),{column:'user_id',operator:'in',value:['student','student2']}],returning:true};
 it('cleans up only the removed organization classroom memberships and retains other organizations',async()=>{
  const db=await setup();
  await db.prepare("INSERT INTO organization_members(id,organization_id,user_id,role) VALUES('om-student-other','other','student','student')").run();
  await db.prepare("INSERT INTO classroom_members(id,classroom_id,user_id,role) VALUES('cm-student-other','privateclass','student','student'),('cm-unrelated-orphan','privateclass','teacher','teacher')").run();
  await queryResource(db,'owner','organization_members',{...deleteStudents,filters:[eq('organization_id','org'),eq('user_id','student')]});
  expect(await db.prepare("SELECT id FROM organization_members WHERE user_id='student' AND organization_id='org'").first()).toBeNull();
  expect(await db.prepare("SELECT id FROM classroom_members WHERE user_id='student' AND classroom_id='class'").first()).toBeNull();
  expect(await db.prepare("SELECT id FROM organization_members WHERE id='om-student-other'").first('id')).toBe('om-student-other');
  expect(await db.prepare("SELECT id FROM classroom_members WHERE id='cm-student-other'").first('id')).toBe('cm-student-other');
  expect(await db.prepare("SELECT id FROM classroom_members WHERE id='cm-unrelated-orphan'").first('id')).toBe('cm-unrelated-orphan');
  expect(await db.prepare("SELECT count(*) n FROM audit_events WHERE action='organization_members.delete'").first('n')).toBe(1);
  expect(await db.prepare('SELECT count(*) n FROM mutation_guards').first('n')).toBe(0);
 });
 it('rolls back membership removal and classroom cleanup when its audit write fails',async()=>{
  const db=await setup();
  await db.exec("CREATE TRIGGER fail_delete_audit BEFORE INSERT ON audit_events WHEN NEW.action='organization_members.delete' BEGIN SELECT RAISE(ABORT,'forced audit failure'); END;");
  await expect(queryResource(db,'owner','organization_members',deleteStudents)).rejects.toThrow('forced audit failure');
  expect(await db.prepare("SELECT count(*) n FROM organization_members WHERE organization_id='org' AND user_id IN ('student','student2')").first('n')).toBe(2);
  expect(await db.prepare("SELECT count(*) n FROM classroom_members WHERE user_id IN ('student','student2')").first('n')).toBe(2);
  expect(await db.prepare('SELECT count(*) n FROM audit_events').first('n')).toBe(0);
  expect(await db.prepare('SELECT count(*) n FROM mutation_guards').first('n')).toBe(0);
 });
 it('rolls back a partial delete if a target becomes a protected owner after preselection',async()=>{
  const db=await setup();const batch=db.batch.bind(db);let intercepted=false;
  const racing={prepare:db.prepare.bind(db),batch:async(statements:D1PreparedStatement[])=>{if(!intercepted){intercepted=true;await db.prepare("UPDATE organization_members SET role='owner' WHERE user_id='student2' AND organization_id='org'").run();}return batch(statements);}} as D1Database;
  await expect(queryResource(racing,'owner','organization_members',deleteStudents)).rejects.toMatchObject({status:409});
  expect(await db.prepare("SELECT role FROM organization_members WHERE user_id='student' AND organization_id='org'").first('role')).toBe('student');
  expect(await db.prepare("SELECT role FROM organization_members WHERE user_id='student2' AND organization_id='org'").first('role')).toBe('owner');
  expect(await db.prepare("SELECT count(*) n FROM classroom_members WHERE user_id IN ('student','student2')").first('n')).toBe(2);
  expect(await db.prepare('SELECT count(*) n FROM audit_events').first('n')).toBe(0);
  expect(await db.prepare('SELECT count(*) n FROM mutation_guards').first('n')).toBe(0);
 });
});
