import { HttpError } from "./http";

/** Hard byte budget, including chunked requests and provider responses. */
export async function readBoundedBody(body: ReadableStream<Uint8Array> | null, maxBytes: number) {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "Request or response is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function boundedJson(request: Request | Response, maxBytes = 64_000): Promise<unknown> {
  const bytes = await readBoundedBody(request.body, maxBytes);
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
}

/** Conditional UPSERT prevents concurrent requests exceeding a window. */
export async function consumeQuota(db: D1Database, actorId: string, feature: "ai" | "execute" | "avatar", limit: number) {
  const windowStart = Math.floor(Date.now() / 3_600_000) * 3_600_000;
  const result = await db.prepare(`
    INSERT INTO api_usage (actor_id, feature, window_start, count) VALUES (?, ?, ?, 1)
    ON CONFLICT(actor_id, feature, window_start) DO UPDATE SET count = count + 1
    WHERE count < ? RETURNING count
  `).bind(actorId, feature, windowStart, limit).first<{ count: number }>();
  if (!result) throw new HttpError(429, "Hourly limit reached. Please try again later.");
}

export function integrationFailure(error: unknown): never {
  if (error instanceof HttpError) throw error;
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    throw new HttpError(504, "The service timed out. Please try again.");
  }
  throw new HttpError(502, "The service is temporarily unavailable. Please try again.");
}
