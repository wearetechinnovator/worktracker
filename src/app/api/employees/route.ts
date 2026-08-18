import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Employee from '@/models/Employee';
import WorkEntry from '@/models/WorkEntry';
import Attendance from '@/models/Attendance';
import { hashPassword } from '@/lib/password';
import { isErrorResponse, requireUser } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;
    const today = new Date().toISOString().split('T')[0];
    const [employees, stats, todayAttendances] = await Promise.all([
      Employee.find({ userType: { $ne: 'admin' } })
        .select('name email role Project status avatarColor userType createdAt updatedAt')
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

        return {
          _id: emp._id.toString(),
          name: emp.name,
          email: emp.email,
          role: emp.role,
          Project: emp.Project,
          status: emp.status,
          avatarColor: emp.avatarColor,
          userType: emp.userType || 'employee',
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
    const { name, email, role, Project, status, avatarColor, password, userType } = body;

    if (!name || !email || !role || !Project) {
      return NextResponse.json(
        { success: false, error: 'Name, email, role, and Project are required' },
        { status: 400 }
      );
    }

    const employee = await Employee.create({
      name,
      email,
      role,
      Project,
      status: status || 'Active',
      avatarColor: avatarColor || '#7f56d9',
      password: await hashPassword(password || 'password123'),
      userType: userType || 'employee',
    });

    return NextResponse.json({ success: true, data: employee }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
