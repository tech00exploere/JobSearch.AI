import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/privacy", "/about", "/api"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, _next, favicon, images
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  const isPublic = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith("/privacy"));
  if (isPublic) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get("jobsearch_session");
  if (!sessionCookie && pathname !== "/login") {
    // Redirect unauthenticated user to login page
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
