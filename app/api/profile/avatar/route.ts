import { getEnv } from "@/lib/server/runtime";
import { requireActor } from "@/lib/server/session";
import { HttpError, handleError } from "@/lib/server/http";
import { consumeQuota, readBoundedBody } from "@/lib/server/integration-utils";
import { avatarContentType, MAX_AVATAR_BYTES } from "@/lib/server/avatar";

async function currentAvatar(db: D1Database, actorId: string) {
  const row = await db.prepare("SELECT avatar_key FROM profiles WHERE id = ?").bind(actorId).first<{ avatar_key: string | null }>();
  if (!row) throw new HttpError(404, "Profile not found.");
  return row.avatar_key;
}

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request);
    const env = getEnv();
    const key = await currentAvatar(env.DB, actor.id);
    if (!key) throw new HttpError(404, "No profile avatar.");
    const object = await env.FILES.get(key);
    if (!object) throw new HttpError(404, "Avatar not found.");
    return new Response(object.body, { headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox", ETag: object.httpEtag,
    } });
  } catch (error) { return handleError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    const env = getEnv();
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.startsWith("multipart/form-data;")) throw new HttpError(400, "Use a file upload.");
    const bytes = await readBoundedBody(request.body, MAX_AVATAR_BYTES + 16_384);
    const form = await new Request(request.url, { method: "POST", headers: { "Content-Type": contentType }, body: bytes }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_AVATAR_BYTES) {
      throw new HttpError(400, "Choose an image smaller than 2 MB.");
    }
    const image = new Uint8Array(await file.arrayBuffer());
    const type = avatarContentType(image, file.type);
    await consumeQuota(env.DB, actor.id, "avatar", 20);
    const previous = await currentAvatar(env.DB, actor.id);
    const key = `avatars/${actor.id}/${crypto.randomUUID()}`;
    await env.FILES.put(key, image, { httpMetadata: { contentType: type } });
    try {
      const updated = await env.DB.prepare("UPDATE profiles SET avatar_key = ?, updated_at = ? WHERE id = ? AND avatar_key IS ?")
        .bind(key, new Date().toISOString(), actor.id, previous).run();
      if (updated.meta.changes !== 1) throw new HttpError(409, "Avatar changed in another tab. Please reload.");
    } catch (error) {
      await env.FILES.delete(key).catch(() => console.error("Avatar upload cleanup failed"));
      throw error;
    }
    if (previous) await env.FILES.delete(previous).catch(() => console.error("Old avatar cleanup failed"));
    return Response.json({ avatar_url: `/api/profile/avatar?v=${encodeURIComponent(key.split("/").pop() || "")}` }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleError(error); }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireActor(request);
    const env = getEnv();
    const previous = await currentAvatar(env.DB, actor.id);
    if (previous) {
      const updated = await env.DB.prepare("UPDATE profiles SET avatar_key = NULL, updated_at = ? WHERE id = ? AND avatar_key = ?")
        .bind(new Date().toISOString(), actor.id, previous).run();
      if (updated.meta.changes !== 1) throw new HttpError(409, "Avatar changed in another tab. Please reload.");
      await env.FILES.delete(previous).catch(() => console.error("Avatar deletion cleanup failed"));
    }
    return Response.json({ avatar_url: null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleError(error); }
}
