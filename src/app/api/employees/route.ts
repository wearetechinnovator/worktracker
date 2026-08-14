import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Employee from '@/models/Employee';
import WorkEntry from '@/models/WorkEntry';
import { hashPassword } from '@/lib/password';

export async function GET() {
  try {
    await dbConnect();
    const [employees, stats] = await Promise.all([
      Employee.find({})
        .select('name email role department status avatarColor userType createdAt updatedAt')
        .sort({ createdAt: -1 })
        .lean(),
      WorkEntry.aggregate<{ _id: string; totalMinutes: number; entryCount: number }>([
        { $group: { _id: '$employeeId', totalMinutes: { $sum: '$actualTime' }, entryCount: { $sum: 1 } } },
      ]),
    ]);
    const statsByEmployee = new Map(stats.map((stat) => [stat._id.toString(), stat]));

    const employeesWithStats = employees.map((emp) => {
        const stat = statsByEmployee.get(emp._id.toString());

        return {
          _id: emp._id.toString(),
          name: emp.name,
          email: emp.email,
          role: emp.role,
          department: emp.department,
          status: emp.status,
          avatarColor: emp.avatarColor,
          userType: emp.userType || 'employee',
          createdAt: emp.createdAt,
          updatedAt: emp.updatedAt,
          totalMinutes: stat?.totalMinutes ?? 0,
          entryCount: stat?.entryCount ?? 0,
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
    const { name, email, role, department, status, avatarColor, password, userType } = body;

    if (!name || !email || !role || !department) {
      return NextResponse.json(
        { success: false, error: 'Name, email, role, and department are required' },
        { status: 400 }
      );
    }

    const employee = await Employee.create({
      name,
      email,
      role,
      department,
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
