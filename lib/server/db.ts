export function parseRow(row: Record<string,unknown>): Record<string,unknown> {
 const result={...row}; if(typeof result.metadata==='string') { try {result.metadata=JSON.parse(result.metadata);} catch {result.metadata={};} }
 if(result.avatar_key) result.avatar_url='/api/profile/avatar'; delete result.avatar_key;
 return result;
}
export function audit(db:D1Database,actorId:string,organizationId:string|null,action:string,resourceId:string) {
 return db.prepare('INSERT INTO audit_events(id,actor_id,organization_id,action,resource_id) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),actorId,organizationId,action,resourceId);
}
