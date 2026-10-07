import { Buffer } from "node:buffer";
import { z } from "zod";
import { getEnv } from "@/lib/server/runtime";
import { requireActor } from "@/lib/server/session";
import { authorizeProgram } from "@/lib/server/authorization";
import { HttpError, handleError } from "@/lib/server/http";
import { boundedJson, consumeQuota, integrationFailure } from "@/lib/server/integration-utils";

const inputSchema = z.object({
  programId: z.string().min(1).max(100),
  source_code: z.string().min(1).max(32_000),
  language_id: z.union([z.literal(63), z.literal(71), z.literal(62), z.literal(54)]),
  stdin: z.string().max(8_000).optional(),
});
const outputSchema = z.object({
  stdout: z.string().nullable().optional(),
  stderr: z.string().nullable().optional(),
  compile_output: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  status: z.object({ id: z.number(), description: z.string() }),
  time: z.string().nullable().optional(),
  memory: z.number().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    const env = getEnv();
    const input = inputSchema.parse(await boundedJson(request));
    await authorizeProgram(env.DB, actor.id, input.programId, "read");
    if (!env.JUDGE0_KEY) throw new HttpError(503, "Code execution is not configured yet.");
    const destination = new URL(env.JUDGE0_URL);
    if (destination.protocol !== "https:" || destination.username || destination.password) {
      throw new HttpError(503, "Code execution configuration is invalid.");
    }
    await consumeQuota(env.DB, actor.id, "execute", 60);
    const signal = AbortSignal.timeout(25_000);
    const headers = {
      "Content-Type": "application/json",
      "X-RapidAPI-Host": env.JUDGE0_HOST,
      "X-RapidAPI-Key": env.JUDGE0_KEY,
    };
    const endpoint = new URL("submissions", `${destination.href.replace(/\/$/, "")}/`);
    endpoint.search = "base64_encoded=true&wait=false";
    const response = await fetch(endpoint, {
      method: "POST", headers, signal,
      body: JSON.stringify({
        source_code: Buffer.from(input.source_code).toString("base64"),
        language_id: input.language_id,
        stdin: Buffer.from(input.stdin || "").toString("base64"),
        cpu_time_limit: 3, wall_time_limit: 5, memory_limit: 128_000,
      }),
    }).catch(integrationFailure);
    if (!response.ok) throw new HttpError(502, "The execution service could not accept your code.");
    const submitted = z.object({ token: z.string().regex(/^[a-zA-Z0-9-]{1,100}$/) }).parse(await boundedJson(response));
    let output: z.infer<typeof outputSchema> | undefined;
    for (let attempt = 0; attempt < 12; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      const pollingUrl = new URL(`submissions/${submitted.token}`, `${destination.href.replace(/\/$/, "")}/`);
      pollingUrl.search = "base64_encoded=true&fields=stdout,stderr,compile_output,message,status,time,memory";
      const polled = await fetch(pollingUrl, { headers, signal }).catch(integrationFailure);
      if (!polled.ok) throw new HttpError(502, "Could not retrieve the execution result.");
      output = outputSchema.parse(await boundedJson(polled, 96_000));
      if (output.status.id > 2) break;
    }
    if (!output || output.status.id <= 2) throw new HttpError(504, "Execution is taking too long. Please try again.");
    const decode = (value: string | null | undefined) => value ? Buffer.from(value, "base64").toString("utf8") : null;
    return Response.json({
      ...output, stdout: decode(output.stdout), stderr: decode(output.stderr),
      compile_output: decode(output.compile_output), message: decode(output.message),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleError(error);
  }
}
