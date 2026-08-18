import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/session';

const publicPaths = new Set(['/login', '/api/auth/login', '/api/auth/logout']);

// Pages restricted to admins only
const adminPages = new Set(['/employees', '/reports', '/settings', '/attendance']);

export function authMiddleware(request: NextRequest) {
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

  // 5. Role-based authorization & data isolation
  const isAdmin = session.userType === 'admin';

  if (!isAdmin) {
    // Restrict admin-only pages
    if (adminPages.has(pathname)) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Restrict admin-only API writes/mutations
    const isApiRequest = pathname.startsWith('/api/');
    if (isApiRequest) {
      const method = request.method;
      
      // Admin-only write APIs
      const isAdminOnlyWriteApi = 
        pathname.startsWith('/api/employees') || 
        pathname.startsWith('/api/projects') || 
        pathname.startsWith('/api/settings');

      if (isAdminOnlyWriteApi && method !== 'GET') {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }

      // Enforce data isolation for employee read APIs
      if (pathname === '/api/work' || pathname === '/api/attendance' || pathname === '/api/punch') {
        const url = new URL(request.url);
        const empId = url.searchParams.get('employeeId');

        if (empId && empId !== session.userId) {
          return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        if (!empId) {
          url.searchParams.set('employeeId', session.userId);
          return NextResponse.rewrite(url);
        }
      }
    }
  }

  return NextResponse.next();
}
