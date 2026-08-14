import 'server-only';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Employee from '@/models/Employee';
import { readSession, sessionCookie } from '@/lib/session';

export async function currentUser() {
  const token = (await cookies()).get(sessionCookie.name)?.value;
  const session = readSession(token);
  if (!session) return null;
  const employee = await Employee.findById(session.userId).select('_id userType department status').lean();
  if (!employee || employee.status !== 'Active' || employee.userType !== session.userType) return null;
  return { id: employee._id.toString(), userType: employee.userType, department: employee.department };
}

export async function requireUser() {
  const user = await currentUser();
  return user ?? NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
}

export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
