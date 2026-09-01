import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/session';

const publicPaths = new Set(['/','/login', '/api/auth/login', '/api/auth/logout']);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Static asset and Next.js internal bypass
  if (pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // 2. Decode session
  const session = readSession(request.cookies.get('worktracker_session')?.value);

  // 3. Handle public paths
  if (publicPaths.has(pathname)) {
    if (session && pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 4. Require authentication
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
};
