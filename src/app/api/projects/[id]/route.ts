import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Project';
import WorkEntry from '@/models/WorkEntry';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const project = await Project.findById(id).populate('members');
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    const logQuery: any = { projectId: id };
    if (employeeId) {
      logQuery.employeeId = employeeId;
    }

    const entries = await WorkEntry.find(logQuery)
      .populate('employeeId')
      .sort({ date: -1, startTime: -1 });

    const totalMinutes = entries.reduce((sum, entry) => sum + entry.actualTime, 0);

    return NextResponse.json({
      success: true,
      data: {
        project: {
          _id: project._id.toString(),
          name: project.name,
          description: project.description,
          color: project.color,
          members: project.members,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        },
        entries: entries.map(entry => {
          const emp = entry.employeeId as any;
          return {
            _id: entry._id.toString(),
            projectId: entry.projectId?.toString() || '',
            employeeId: emp ? emp._id.toString() : (entry.employeeId?.toString() || ''),
            employeeName: emp ? emp.name : 'Unknown Employee',
            employeeAvatarColor: emp ? emp.avatarColor : '#7f56d9',
            title: entry.title,
            date: entry.date,
            startTime: entry.startTime,
            endTime: entry.endTime,
            actualTime: entry.actualTime,
            description: entry.description,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
          };
        }),
        totalMinutes,
        entryCount: entries.length,
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
    const { name, description, color, members } = body;

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (color) project.color = color;
    if (members) project.members = members;

    await project.save();

    const populated = await project.populate('members');
    return NextResponse.json({ success: true, data: populated });
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

    const project = await Project.findByIdAndDelete(id);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    await WorkEntry.deleteMany({ projectId: id });

    return NextResponse.json({ success: true, message: 'Project and all work entries deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
