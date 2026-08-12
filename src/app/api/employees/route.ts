import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Employee from '@/models/Employee';
import WorkEntry from '@/models/WorkEntry';

export async function GET() {
  try {
    await dbConnect();
    const employees = await Employee.find({}).sort({ createdAt: -1 });

    const employeesWithStats = await Promise.all(
      employees.map(async (emp) => {
        const stats = await WorkEntry.aggregate([
          { $match: { employeeId: emp._id } },
          {
            $group: {
              _id: null,
              totalMinutes: { $sum: '$actualTime' },
              entryCount: { $sum: 1 },
            },
          },
        ]);

        const totalMinutes = stats.length > 0 ? stats[0].totalMinutes : 0;
        const entryCount = stats.length > 0 ? stats[0].entryCount : 0;

        return {
          _id: emp._id.toString(),
          name: emp.name,
          email: emp.email,
          role: emp.role,
          department: emp.department,
          status: emp.status,
          avatarColor: emp.avatarColor,
          createdAt: emp.createdAt,
          updatedAt: emp.updatedAt,
          totalMinutes,
          entryCount,
        };
      })
    );

    return NextResponse.json({ success: true, data: employeesWithStats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { name, email, role, department, status, avatarColor } = body;

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
    });

    return NextResponse.json({ success: true, data: employee }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
