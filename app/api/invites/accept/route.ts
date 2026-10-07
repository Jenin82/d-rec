import { getEnv } from '@/lib/server/runtime';
import { requireActor } from '@/lib/server/session';
import { handleError } from '@/lib/server/http';
import { acceptInvites } from '@/lib/server/invites';
export async function POST(request:Request) {try{const actor=await requireActor(request);return Response.json(await acceptInvites(getEnv().DB,actor));}catch(error){return handleError(error);}}
