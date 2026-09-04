import 'server-only';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Employee from '@/models/Employee';
import Role from '@/models/Role';
import Attendance from '@/models/Attendance';
import { readSession, sessionCookie } from '@/lib/session';
import { ALL_PERMISSION_KEYS } from '@/lib/permissions';

export async function currentUser() {
  const token = (await cookies()).get(sessionCookie.name)?.value;
  const session = readSession(token);
  if (!session) return null;

  await dbConnect();
  const employee = await Employee.findById(session.userId)
    .select('_id name email userType role roleId Project status')
    .lean();
  if (!employee || employee.status !== 'Active') return null;

  const roleDoc = employee.roleId
    ? await Role.findById(employee.roleId).lean()
    : await Role.findOne({ name: /^Employee$/i }).lean();

  const isSystemAdmin = employee.userType === 'admin' || Boolean(roleDoc?.isSystemAdmin);
  const permissions: string[] = roleDoc?.permissions || (isSystemAdmin ? ALL_PERMISSION_KEYS : []);

  // Check today's Punch-In status
  const today = new Date().toISOString().split('T')[0];
  const attendance = await Attendance.findOne({
    employeeId: employee._id,
    date: today,
    checkIn: { $exists: true, $ne: null },
    checkOut: null,
  }).lean();
  const isPunchedIn = Boolean(attendance);

  return {
    id: employee._id.toString(),
    _id: employee._id.toString(),
    name: employee.name,
    email: employee.email,
    userType: employee.userType,
    role: employee.role,
    roleId: employee.roleId?.toString(),
    Project: employee.Project,
    isSystemAdmin,
    permissions,
    isPunchedIn,
  };
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
