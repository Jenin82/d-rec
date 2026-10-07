import { getEnv } from '@/lib/server/runtime';
import { requireActor } from '@/lib/server/session';
import { handleError,readJson,HttpError } from '@/lib/server/http';
import { mutateSubmission } from '@/lib/server/submissions';
export async function POST(request:Request,context:{params:Promise<{id:string}>}) {try{
 const actor=await requireActor(request),id=(await context.params).id,body=await readJson(request);
 delete body.algorithmVersion; const expectedVersion=body.codeVersion; delete body.codeVersion;
 const current=await getEnv().DB.prepare('SELECT id FROM code_submissions WHERE program_id=? AND student_id=?').bind(id,actor.id).first<{id:string}>();if(!current)throw new HttpError(404,'Save a code draft first');
 return Response.json(await mutateSubmission(getEnv().DB,actor.id,'code_submissions',{operation:'update',columns:'*',filters:[{column:'id',operator:'eq',value:current.id}],values:{...body,expectedVersion,status:'pending'},returning:true,single:'single'}));
}catch(error){return handleError(error);}}
