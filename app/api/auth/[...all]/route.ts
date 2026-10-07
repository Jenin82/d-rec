import { getAuth } from "@/lib/server/auth";
import { handleError } from "@/lib/server/http";
import { getEnv } from "@/lib/server/runtime";
async function handle(request: Request) {
  // Better Auth's disabledPaths matches exact paths; old reset links contain a token.
  const path = new URL(request.url).pathname.replace(/\/+$/, "");
  if (path.startsWith("/api/auth/reset-password/")) return new Response("Not Found", { status: 404 });
  try {
    const env = getEnv();
    if (path === "/api/auth/sign-in/social" && (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET)) {
      return Response.json({ code: "GOOGLE_AUTH_NOT_CONFIGURED", message: "Google sign-in is not configured yet." }, { status: 503 });
    }
    return await getAuth(env).handler(request);
  }
  catch (error) { return handleError(error); }
}
export const GET = handle;
export const POST = handle;
