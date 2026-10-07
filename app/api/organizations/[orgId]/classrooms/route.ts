import { getEnv } from '@/lib/server/runtime';
import { requireActor } from '@/lib/server/session';
import { handleError,readJson } from '@/lib/server/http';
import { createClassroom } from '@/lib/server/organizations';
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}) {try{const actor=await requireActor(request);return Response.json(await createClassroom(getEnv().DB,actor.id,(await context.params).orgId,await readJson(request)));}catch(error){return handleError(error);}}
