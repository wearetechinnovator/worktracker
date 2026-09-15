import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSession } from "./lib/session";
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
    if (!isPublicRoute && !pathname.startsWith("/api")) {
        const token = request.cookies.get("worktracker_session")?.value;
        const session = readSession(token);

        if (!session) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }
    if (pathname.startsWith("/api")) {
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all routes except:
         * - _next/static
         * - _next/image
         * - favicon
         */
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};