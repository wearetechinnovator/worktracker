import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import WorkEntry from '@/models/WorkEntry';
import Project from '@/models/Project';
import Employee from '@/models/Employee';
import { calculateElapsedMinutes } from '@/lib/time';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { projectId, employeeId, title, date, startTime, endTime, description } = body;

    const entry = await WorkEntry.findById(id);
    if (!entry) {
      return NextResponse.json({ success: false, error: 'Work entry not found' }, { status: 404 });
    }

    if (projectId) {
      const projectExists = await Project.findById(projectId);
      if (!projectExists) {
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
      }
      entry.projectId = projectId;
    }

    if (employeeId) {
      const employeeExists = await Employee.findById(employeeId);
      if (!employeeExists) {
        return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
      }
      entry.employeeId = employeeId;
    }

    if (title) entry.title = title;
    if (date) entry.date = date;
    if (startTime) entry.startTime = startTime;
    if (endTime) entry.endTime = endTime;
    if (description !== undefined) entry.description = description;

    if (startTime || endTime) {
      entry.actualTime = calculateElapsedMinutes(entry.startTime, entry.endTime);
    }

    await entry.save();

    const populated = await entry.populate([
      { path: 'projectId', select: 'name color' },
      { path: 'employeeId', select: 'name avatarColor role' }
    ]);
    const proj = populated.projectId as any;
    const emp = populated.employeeId as any;

    const formattedEntry = {
      _id: populated._id.toString(),
      projectId: proj ? proj._id.toString() : populated.projectId.toString(),
      projectName: proj ? proj.name : 'Unknown Project',
      projectColor: proj ? proj.color : '#cbd5e1',
      employeeId: emp ? emp._id.toString() : populated.employeeId.toString(),
      employeeName: emp ? emp.name : 'Unknown Employee',
      employeeAvatarColor: emp ? emp.avatarColor : '#7f56d9',
      employeeRole: emp ? emp.role : '',
      title: populated.title,
      date: populated.date,
      startTime: populated.startTime,
      endTime: populated.endTime,
      actualTime: populated.actualTime,
      description: populated.description,
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt,
    };

    return NextResponse.json({ success: true, data: formattedEntry });
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

    const entry = await WorkEntry.findByIdAndDelete(id);
    if (!entry) {
      return NextResponse.json({ success: false, error: 'Work entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Work entry deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
