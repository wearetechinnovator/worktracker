import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Employee from '@/models/Employee';
import WorkEntry from '@/models/WorkEntry';
import Attendance from '@/models/Attendance';
import Role from '@/models/Role';
import { hashPassword } from '@/lib/password';
import { isErrorResponse, requireUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    const { searchParams } = new URL(request.url);
    const includeAdmin = searchParams.get('includeAdmin') === 'true';
    const filter: any = includeAdmin ? {} : { userType: { $ne: 'admin' } };

    const today = new Date().toISOString().split('T')[0];
    const [employees, stats, todayAttendances] = await Promise.all([
      Employee.find(filter)
        .select('name email password rawPassword role roleId Project status avatarColor userType workMode createdAt updatedAt')
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
        roleId: emp.roleId?.toString(),
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
    const {
      name,
      email,
      role,
      roleId,
      Project,
      status,
      avatarColor,
      password,
      workMode,
    } = await request.json();
    const normalizedRole = typeof role === 'string' ? role.trim() : '';

    if (!name.trim() || !email.trim() || !password.trim() || !role.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please fill all required fields' },
        { status: 400 }
      );
    }

    // if (!name.trim()) {
    //   return NextResponse.json(
    //     { success: false, error: 'Name, designation, system role, and Project are required' },
    //     { status: 400 }
    //   );

    // }

    const selectedRole = await Role.findById(roleId).lean();
    if (!selectedRole || selectedRole.name.toLowerCase() !== 'employee') {
      return NextResponse.json({ success: false, error: 'Invalid system role' }, { status: 400 });
    }

    // const plainPassword = password || 'password123';
    const employee = await Employee.create({
      name,
      email,
      role: normalizedRole,
      roleId: selectedRole._id,
      Project,
      status: status || 'Active',
      avatarColor: avatarColor || '#7f56d9',
      password,
      // rawPassword: plainPassword,
      userType: 'employee',
      workMode: workMode || 'Hybrid',
    });

    return NextResponse.json({ success: true, data: employee }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
