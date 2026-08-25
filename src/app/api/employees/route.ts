import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Employee from '@/models/Employee';
import WorkEntry from '@/models/WorkEntry';
import Attendance from '@/models/Attendance';
import Role from '@/models/Role';
import { hashPassword } from '@/lib/password';
import { isErrorResponse, requireUser } from '@/lib/auth';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function ensureRoleExists(roleName: string) {
  const trimmedRoleName = roleName.trim();
  if (!trimmedRoleName) return;

  const existing = await Role.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(trimmedRoleName)}$`, 'i') },
  });

  if (!existing) {
    await Role.create({
      name: trimmedRoleName,
      description: 'Auto-detected from employee profiles',
    });
  }
}

export async function GET() {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;
    const today = new Date().toISOString().split('T')[0];
    const [employees, stats, todayAttendances] = await Promise.all([
      Employee.find({})
        .select('name email password rawPassword role Project status avatarColor userType workMode createdAt updatedAt')
        .sort({ createdAt: -1 })
        .lean(),
      WorkEntry.aggregate<{ _id: string; totalMinutes: number; entryCount: number }>([
        { $group: { _id: '$employeeId', totalMinutes: { $sum: '$actualTime' }, entryCount: { $sum: 1 } } },
      ]),
      Attendance.find({ date: today }).lean(),
    ]);
    const statsByEmployee = new Map(stats.map((stat) => [stat._id.toString(), stat]));
    const attendanceMap = new Map(todayAttendances.map((att) => [att.employeeId.toString(), att]));

    const employeesWithStats = employees.map((emp) => {
        const stat = statsByEmployee.get(emp._id.toString());
        const att = attendanceMap.get(emp._id.toString());
        const rawPass = (emp as any).rawPassword;
        const pass = emp.password;
        const displayPassword = rawPass || (pass && !pass.startsWith('scrypt:') ? pass : 'password123');

        return {
          _id: emp._id.toString(),
          name: emp.name,
          email: emp.email,
          password: displayPassword,
          role: emp.role,
          Project: emp.Project,
          status: emp.status,
          avatarColor: emp.avatarColor,
          userType: emp.userType || 'employee',
          workMode: emp.workMode || 'Hybrid',
          createdAt: emp.createdAt,
          updatedAt: emp.updatedAt,
          totalMinutes: stat?.totalMinutes ?? 0,
          entryCount: stat?.entryCount ?? 0,
          todayAttendance: att ? {
            allowPunchInDate: att.allowPunchInDate || null,
            allowPunchOutDate: att.allowPunchOutDate || null,
          } : null,
        };
      });

    return NextResponse.json({ success: true, data: employeesWithStats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { name, email, role, Project, status, avatarColor, password, userType, workMode } = body;
    const normalizedRole = typeof role === 'string' ? role.trim() : '';

    if (!name || !email || !normalizedRole || !Project) {
      return NextResponse.json(
        { success: false, error: 'Name, email, role, and Project are required' },
        { status: 400 }
      );
    }

    const plainPassword = password || 'password123';
    const employee = await Employee.create({
      name,
      email,
      role: normalizedRole,
      Project,
      status: status || 'Active',
      avatarColor: avatarColor || '#7f56d9',
      password: await hashPassword(plainPassword),
      rawPassword: plainPassword,
      userType: userType || 'employee',
      workMode: workMode || 'Hybrid',
    });

    try {
      await ensureRoleExists(normalizedRole);
    } catch (roleError: any) {
      if (roleError?.code !== 11000) {
        throw roleError;
      }
    }

    return NextResponse.json({ success: true, data: employee }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
