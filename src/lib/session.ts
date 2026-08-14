import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

export type Session = {
  userId: string;
  userType: 'admin' | 'employee';
  expiresAt: number;
};

const COOKIE_NAME = 'worktracker_session';
const MAX_AGE_SECONDS = 60 * 60 * 8;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
  return value;
}

function signature(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

export function createSession(userId: string, userType: Session['userType']) {
  const payload: Session = { userId, userType, expiresAt: Date.now() + MAX_AGE_SECONDS * 1000 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return { token: `${encoded}.${signature(encoded)}`, expiresAt: new Date(payload.expiresAt) };
}

export function readSession(token?: string): Session | null {
  if (!token) return null;
  const [encoded, receivedSignature] = token.split('.');
  if (!encoded || !receivedSignature) return null;
  const expectedSignature = signature(encoded);
  if (receivedSignature.length !== expectedSignature.length || !timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expectedSignature))) return null;
  try {
    const session = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Session;
    return session.expiresAt > Date.now() && ['admin', 'employee'].includes(session.userType) ? session : null;
  } catch {
    return null;
  }
}

export const sessionCookie = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  },
};
