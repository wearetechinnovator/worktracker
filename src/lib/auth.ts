import 'server-only';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Employee from '@/models/Employee';
import Role from '@/models/Role';
import Attendance from '@/models/Attendance';
import { readSession, sessionCookie } from '@/lib/session';
import { ALL_PERMISSION_KEYS } from '@/lib/permissions';
import { mockStore } from '@/lib/mockData';
import User from '@/models/User';
import { use } from 'react';

export async function currentUser() {
  const token = (await cookies()).get(sessionCookie.name)?.value;
  const session = readSession(token);
  
  // If session is present or in demo mode, return demo user
  if(!session){
    return null;
  }
  const user = await User.findById(session.userId);

  if(!user){
    return null;
  }
  return user;
}

export async function requireUser() {
  const user = await currentUser();
  return user ?? NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
}

export async function requirePermission(requiredPermission: string) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  // System Admin bypasses all permission checks
  if (user.isSystemAdmin) {
    return user;
  }

  // Check if user's assigned role grants the required permission
  if (!user.permissions.includes(requiredPermission)) {
    return NextResponse.json(
      { success: false, error: `Forbidden: Your role (${user.role || 'User'}) lacks permission '${requiredPermission}'` },
      { status: 403 }
    );
  }

  return user;
}

export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
