import { getEnv } from '@/lib/server/runtime';
import { requireActor } from '@/lib/server/session';
import { handleError,readJson } from '@/lib/server/http';
import { queryResource } from '@/lib/server/resources';
import type { QueryRequest } from '@/types/resource';
export async function POST(request:Request,context:{params:Promise<{table:string}>}) {
 try {const actor=await requireActor(request);const {table}=await context.params;return Response.json(await queryResource(getEnv().DB,actor.id,table,await readJson(request) as unknown as QueryRequest));}catch(error){return handleError(error);}
}
