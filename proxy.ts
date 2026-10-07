import { NextResponse, type NextRequest } from "next/server";
import { getVerifiedGoogleSession } from "@/lib/server/session";
const PUBLIC_ROUTES = new Set(["/", "/login", "/signup", "/auth/callback"]);
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (PUBLIC_ROUTES.has(pathname) || pathname.startsWith("/api/")) return NextResponse.next();
  const session = await getVerifiedGoogleSession(request);
  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
