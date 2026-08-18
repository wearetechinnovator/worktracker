import { NextRequest } from 'next/server';
import { authMiddleware } from './middleware/middleware';

export function proxy(request: NextRequest) {
  return authMiddleware(request);
}

export const config = {
  matcher: [
    // Match all routes except files with extensions (e.g. .svg, .png, .jpg, .css, .js)
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
};
