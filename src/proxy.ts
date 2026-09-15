import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = [
  "/login",
  "/register",
  "/otp",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // API routes are handled by their own authentication logic
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Public pages don't require authentication
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Only check whether the session cookie exists here.
  // The actual session validation happens in currentUser().
  const sessionToken = request.cookies.get("worktracker_session")?.value;

  if (!sessionToken) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

