import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/session';

const publicPaths = new Set(['/login', '/api/auth/login']);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicPaths.has(pathname) || pathname.startsWith('/_next') || pathname === '/favicon.ico') return NextResponse.next();
  if (readSession(request.cookies.get('worktracker_session')?.value)) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = { matcher: ['/((?!_next/static|_next/image|.*\\.svg$).*)'] };
