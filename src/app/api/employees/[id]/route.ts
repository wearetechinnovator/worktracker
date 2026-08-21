import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Employee from '@/models/Employee';
import Role from '@/models/Role';
import WorkEntry from '@/models/WorkEntry';
import { hashPassword } from '@/lib/password';

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
          Project: employee.Project,
          status: employee.status,
          avatarColor: employee.avatarColor,
          userType: employee.userType,
          workMode: employee.workMode || 'Hybrid',
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
    const { name, email, role, Project, status, avatarColor, password, userType, workMode } = body;
    const normalizedRole = typeof role === 'string' ? role.trim() : '';

    const employee = await Employee.findById(id);
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    if (name) employee.name = name;
    if (email) employee.email = email;
    if (normalizedRole) employee.role = normalizedRole;
    if (Project) employee.Project = Project;
    if (status) employee.status = status;
    if (avatarColor) employee.avatarColor = avatarColor;
    if (password) {
      employee.password = await hashPassword(password);
      employee.rawPassword = password;
    }
    if (userType) employee.userType = userType;
    if (workMode) employee.workMode = workMode;

    await employee.save();

    if (normalizedRole) {
      try {
        await ensureRoleExists(normalizedRole);
      } catch (roleError: any) {
        if (roleError?.code !== 11000) {
          throw roleError;
        }
      }
    }

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
