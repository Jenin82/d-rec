import { getEnv } from '@/lib/server/runtime';
import { requireActor } from '@/lib/server/session';
import { handleError,readJson } from '@/lib/server/http';
import { reopenProgram } from '@/lib/server/submissions';
export async function POST(request:Request,context:{params:Promise<{id:string}>}) {try{const actor=await requireActor(request);return Response.json(await reopenProgram(getEnv().DB,actor.id,(await context.params).id,await readJson(request)));}catch(error){return handleError(error);}}
