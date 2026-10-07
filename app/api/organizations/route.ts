import { getEnv } from '@/lib/server/runtime';
import { requireActor } from '@/lib/server/session';
import { handleError,readJson } from '@/lib/server/http';
import { createOrganization,listOrganizations } from '@/lib/server/organizations';
export async function POST(request:Request) {try{const actor=await requireActor(request);return Response.json(await createOrganization(getEnv().DB,actor.id,await readJson(request)));}catch(error){return handleError(error);}}

export async function GET(request:Request) {try{const actor=await requireActor(request);return Response.json(await listOrganizations(getEnv().DB,actor.id));}catch(error){return handleError(error);}}
