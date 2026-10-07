import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = 'REQUEST_ERROR') { super(message); }
}
export function handleError(error: unknown): Response {
  if(error instanceof ZodError) return Response.json({data:null,error:{message:'Invalid request',code:'VALIDATION_ERROR'}},{status:400});
  if (error instanceof HttpError) return Response.json({ data: null, error: { message: error.message, code: error.code } }, { status: error.status });
  return Response.json({ data: null, error: { message: 'Unable to complete request', code: 'SERVER_ERROR' } }, { status: 500 });
}
export async function readJson(request: Request, maxBytes = 200000): Promise<Record<string, unknown>> {
  if (Number(request.headers.get('content-length') || 0) > maxBytes) throw new HttpError(413, 'Request too large');
  const reader=request.body?.getReader(); const chunks:Uint8Array[]=[];let size=0;
  if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new HttpError(413,'Request too large');}chunks.push(value);}}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try { const value = JSON.parse(new TextDecoder().decode(bytes)); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value; } catch { throw new HttpError(400, 'Invalid JSON object'); }
}
export function textValue(value: unknown, name: string, max = 5000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new HttpError(400, `Invalid ${name}`);
  return value.trim();
}

export const readJSON = readJson;
export function assertSameOrigin(request: Request): void {
 if (['GET','HEAD','OPTIONS'].includes(request.method)) return;
 const origin=request.headers.get('origin'); const site=request.headers.get('sec-fetch-site');
 if(origin&&origin!==new URL(request.url).origin || !origin&&site&&site!=='same-origin'&&site!=='none') throw new HttpError(403,'Cross-origin mutation denied');
}
