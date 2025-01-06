import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const userId = req.cookies.get("userId")?.value;

  // ✅ If user is logged in
  if (userId) {
    // Redirect logged-in users away from '/', '/login', and '/signup' to the dashboard
    if (pathname === "/" || pathname === "/login" || pathname === "/signup") {
      return NextResponse.redirect(new URL("/dashboard/accounts", req.url));
    }

    // Redirect /dashboard to /dashboard/accounts
    if (pathname === "/dashboard") {
      return NextResponse.redirect(new URL("/dashboard/accounts", req.url));
    }

    // ✅ Allow access to protected routes if the user is authenticated
    return NextResponse.next();
  }

  // 🚫 If user is NOT logged in
  if (!userId) {
    // Allow access to '/', '/login', '/signup', and public API routes
    if (
      pathname === "/" ||
      pathname === "/login" ||
      pathname === "/signup" ||
      pathname.startsWith("/api/login") ||
      pathname.startsWith("/api/signup")
    ) {
      return NextResponse.next();
    }

    // Redirect unauthenticated users trying to access protected routes to '/login'
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/api")) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // ✅ Allow access to all other routes
  return NextResponse.next();
}

// Define which routes the middleware applies to
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
    "/",
    "/login",
    "/signup",
    "/dashboard",
  ],
};
