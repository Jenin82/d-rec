import type { QueryRequest } from '@/types/resource';
import { columns, filters, scope, selection } from './resources-query';
import { HttpError } from './http';
import { parseRow } from './db';
import { mutateResource } from './resources-mutate';
export async function queryResource(db:D1Database,actorId:string,table:string,q:QueryRequest) {
 if(!columns[table])throw new HttpError(400,'Unknown resource');
 if(q.operation!=='select')return mutateResource(db,actorId,table,q);
 const f=filters(table,q),permission=scope(table,actorId);const where=`${f.sql} AND (${permission.sql})`;const args=[...f.args,...permission.args];
 const picked=selection(table,q.columns);const selected=new Set([...picked.selected,'id']);if(picked.join==='organizations')selected.add('organization_id');if(picked.join==='classrooms')selected.add('classroom_id');if(picked.join==='profiles')selected.add('user_id');
 // Private profile fields never leave self scope, even when an untrusted selection asks for '*'.
 const projection=[...selected].map(c=> table==='profiles'&&c==='avatar_url'?`CASE WHEN t.id=? AND t.avatar_key IS NOT NULL THEN '/api/profile/avatar' ELSE NULL END AS avatar_url`:table==='profiles'&&['phone','bio','metadata'].includes(c)?`CASE WHEN t.id=? THEN t.${c} ELSE NULL END AS ${c}`:`t.${c}`).join(',');
 const privateArgs=table==='profiles'?[...selected].filter(c=>['phone','bio','metadata','avatar_url'].includes(c)).map(()=>actorId):[];
 const limit=q.limit===undefined?500:q.limit;if(!Number.isInteger(limit)||limit<1||limit>500)throw new HttpError(400,'Invalid limit');
 const offset=q.offset??0;if(!Number.isInteger(offset)||offset<0||offset>100000)throw new HttpError(400,'Invalid offset');
 let order=' ORDER BY t.id';if(q.order){if(!columns[table].includes(q.order.column)||table==='profiles'&&['phone','bio','metadata','avatar_url'].includes(q.order.column))throw new HttpError(400,'Invalid order');order=` ORDER BY t.${q.order.column} ${q.order.ascending===false?'DESC':'ASC'}, t.id`;}
 const count=q.count?(await db.prepare(`SELECT count(*) AS n FROM ${table} t WHERE ${where}`).bind(...args).first<{n:number}>())?.n:undefined;
 let rows=q.head?[]:(await db.prepare(`SELECT ${projection} FROM ${table} t WHERE ${where}${order} LIMIT ? OFFSET ?`).bind(...privateArgs,...args,limit,offset).all<Record<string,unknown>>()).results.map(parseRow);
 if(picked.join){rows=await Promise.all(rows.map(async row=>{const join=picked.join!; const foreign=join==='organizations'?row.organization_id:join==='classrooms'?row.classroom_id:join==='profiles'?row.user_id:row.id;
 const joinScope=scope(join,actorId); const key=join==='classroom_members'?'classroom_id':'id';const joinedColumns=picked.joinColumns.map(c=>join==='profiles'&&['phone','bio','metadata','avatar_url'].includes(c)?`NULL AS ${c}`:c).join(',');const joined=await db.prepare(`SELECT ${joinedColumns} FROM ${join} t WHERE t.${key}=? AND ${joinScope.sql} LIMIT 501`).bind(foreign,...joinScope.args).all<Record<string,unknown>>();if(join==='classroom_members'&&joined.results.length>500)throw new HttpError(413,'This classroom has more than 500 members. Use paginated classroom_members queries.','NESTED_RESULT_TOO_LARGE');return {...row,[join]:join==='classroom_members'?joined.results:joined.results[0]??null};}));}
 // Return only selected fields plus explicitly requested nested relations.
 rows=rows.map(row=>Object.fromEntries(Object.entries(row).filter(([key])=>picked.selected.includes(key)||key===picked.join)));
 if(q.single==='single'&&rows.length!==1)throw new HttpError(404,'Resource not found','PGRST116');
 if(q.single==='maybeSingle'&&rows.length>1)throw new HttpError(409,'Multiple resources found');
 return {data:q.head?null:q.single?rows[0]??null:rows,error:null,...(q.count?{count}: {})};
}
