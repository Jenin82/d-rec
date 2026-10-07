import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
// Node's built-in SQLite runs the real SQL/constraints; the wrapper implements the D1 methods used by application services.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
type Row = Record<string,unknown>;
export function testDatabase() {
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 sqlite.exec(readFileSync(new URL('../migrations/0001_auth.sql',import.meta.url),'utf8'));
 sqlite.exec(readFileSync(new URL('../migrations/0002_application.sql',import.meta.url),'utf8'));
 sqlite.exec(readFileSync(new URL('../migrations/0003_platform_admins.sql',import.meta.url),'utf8'));
 const execute=(sql:string,args:unknown[])=>{const rows=sqlite.prepare(sql).all(...args.map(v=>typeof v==='boolean'?Number(v):v));const changes=sqlite.prepare('SELECT changes() n').get().n;return {success:true,results:rows,meta:{changes,last_row_id:0,duration:0,rows_read:rows.length,rows_written:changes,served_by:'sqlite-test',size_after:0,changed_db:Boolean(changes)}};};
 const statement=(sql:string,args:unknown[]=[]):D1PreparedStatement=>({
  bind:(...bound:unknown[])=>statement(sql,bound),
  first:async(column?:string)=>{const row=execute(sql,args).results[0]||null;return column&&row?row[column]:row;},
  all:async()=>execute(sql,args),run:async()=>execute(sql,args),
  raw:async()=>execute(sql,args).results.map((row:Row)=>Object.values(row)),
  _execute:()=>execute(sql,args),
 } as unknown as D1PreparedStatement);
 const db={prepare:(sql:string)=>statement(sql),batch:async(statements:D1PreparedStatement[])=>{sqlite.exec('BEGIN');try{const results=statements.map(stmt=>(stmt as unknown as {_execute:()=>D1Result})._execute());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}},exec:async(sql:string)=>{sqlite.exec(sql);return {count:0,duration:0};}} as unknown as D1Database;
 return {db,sqlite,close:()=>sqlite.close()};
}
export async function seededDatabase() {
 const fixture=testDatabase();const {db}=fixture;
 for(const id of ['owner','admin','teacher','teacher2','student','student2','outsider']) {
  await db.prepare('INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,1,0,0)').bind(id,id,`${id}@example.com`).run();
  await db.prepare('INSERT INTO profiles(id,full_name,phone,bio,metadata) VALUES(?,?,?,?,?)').bind(id,id,'private-phone','private-bio','{"secret":"private"}').run();
 }
 await db.prepare("INSERT INTO organizations(id,name) VALUES('org','Classroom org'),('other','Other org')").run();
 for(const [user,role]of [['owner','owner'],['admin','admin'],['teacher','teacher'],['teacher2','teacher'],['student','student'],['student2','student']])await db.prepare('INSERT INTO organization_members(id,organization_id,user_id,role) VALUES(?,?,?,?)').bind(`om-${user}`,'org',user,role).run();
 await db.prepare("INSERT INTO organization_members(id,organization_id,user_id,role) VALUES('om-outsider','other','outsider','owner')").run();
 await db.prepare("INSERT INTO classrooms(id,organization_id,name) VALUES('class','org','Class'),('class2','org','Class2'),('privateclass','other','Private class')").run();
 for(const [user,role,room]of [['teacher','teacher','class'],['teacher2','teacher','class2'],['student','student','class'],['student2','student','class2']])await db.prepare('INSERT INTO classroom_members(id,classroom_id,user_id,role) VALUES(?,?,?,?)').bind(`cm-${user}`,room,user,role).run();
 await db.prepare("INSERT INTO programs(id,classroom_id,title,status) VALUES('program','class','Question','published'),('program2','class2','Other question','published'),('privateprogram','privateclass','Private question','published'),('draftprogram','class','Draft question','draft')").run();
 return fixture;
}
