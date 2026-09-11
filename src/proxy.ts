import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

   
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