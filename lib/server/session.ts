import { getEnv } from "./runtime";
import { getAuth } from "./auth";
import { assertSameOrigin, HttpError } from "./http";

export type Actor = { id: string; email: string; emailVerified: boolean; name: string; image?: string | null };
export async function getVerifiedGoogleSession(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return null;
  const identity = await getEnv().DB.prepare(
    "SELECT u.id FROM user u WHERE u.id=? AND u.emailVerified=1 AND EXISTS(SELECT 1 FROM account a WHERE a.userId=u.id AND a.providerId='google')",
  ).bind(session.user.id).first();
  return identity ? session : null;
}
export async function requireActor(request: Request): Promise<Actor> {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) assertSameOrigin(request);
  const session = await getVerifiedGoogleSession(request);
  if (!session) throw new HttpError(401, "Sign in with a verified Google account to continue");
  await getEnv().DB.prepare("INSERT INTO profiles(id, full_name) VALUES (?, ?) ON CONFLICT(id) DO NOTHING").bind(session.user.id, session.user.name).run();
  return session.user;
}
