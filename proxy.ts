import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = new Set(["/", "/login", "/signup", "/auth/callback"]);

export async function proxy(request: NextRequest) {
  const { supabase, response } = createClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.has(pathname)) {
    return response;
  }

  // Redirect unauthenticated users to login
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // We need to allow /admin, /teacher, /student if they are coming from the dashboard
  // The proxy doesn't have access to localStorage, so we shouldn't force redirect 
  // to dashboard if they are trying to access a role-specific path, because that's
  // exactly where the dashboard tries to send them!
  
  // If they hit the root path while logged in, send them to dashboard
  if (user && pathname === "/") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
