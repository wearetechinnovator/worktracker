import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Employee from '@/models/Employee';
import WorkEntry from '@/models/WorkEntry';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const employee = await Employee.findById(id);
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    const entries = await WorkEntry.find({ employeeId: id }).sort({ date: -1, startTime: -1 });
    const totalMinutes = entries.reduce((sum, entry) => sum + entry.actualTime, 0);

    return NextResponse.json({
      success: true,
      data: {
        employee: {
          _id: employee._id.toString(),
          name: employee.name,
          email: employee.email,
          role: employee.role,
          department: employee.department,
          status: employee.status,
          avatarColor: employee.avatarColor,
          userType: employee.userType,
          password: employee.password,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt,
        },
        entries: entries.map(entry => ({
          _id: entry._id.toString(),
          projectId: entry.projectId.toString(),
          employeeId: entry.employeeId.toString(),
          title: entry.title,
          date: entry.date,
          startTime: entry.startTime,
          endTime: entry.endTime,
          actualTime: entry.actualTime,
          description: entry.description,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        })),
        totalMinutes,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { name, email, role, department, status, avatarColor, password, userType } = body;

    const employee = await Employee.findById(id);
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    if (name) employee.name = name;
    if (email) employee.email = email;
    if (role) employee.role = role;
    if (department) employee.department = department;
    if (status) employee.status = status;
    if (avatarColor) employee.avatarColor = avatarColor;
    if (password) employee.password = password;
    if (userType) employee.userType = userType;

    await employee.save();

    return NextResponse.json({ success: true, data: employee });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const employee = await Employee.findByIdAndDelete(id);
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    await WorkEntry.deleteMany({ employeeId: id });

    return NextResponse.json({ success: true, message: 'Employee and all associated work logs deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
