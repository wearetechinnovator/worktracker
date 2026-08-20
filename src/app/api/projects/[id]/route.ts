import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Project';
import WorkEntry from '@/models/WorkEntry';
import Client from '@/models/Client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const project = await Project.findById(id).populate('members').populate('clientId');
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
          clientId: project.clientId ? {
            _id: (project.clientId as any)._id.toString(),
            name: (project.clientId as any).name,
            emails: (project.clientId as any).emails,
            address: (project.clientId as any).address,
            duration: (project.clientId as any).duration,
          } : null,
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
    const { name, description, color, members, clientId, clientInfo } = body;

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    let finalClientId = clientId;
    if (clientInfo && clientInfo.name && clientInfo.name.trim()) {
      let processedEmails: string[] = [];
      if (Array.isArray(clientInfo.emails)) {
        processedEmails = clientInfo.emails.map((e: any) => String(e).trim()).filter(Boolean);
      } else if (typeof clientInfo.emails === 'string') {
        processedEmails = clientInfo.emails.split(',').map((e: string) => e.trim()).filter(Boolean);
      }

      const client = await Client.create({
        name: clientInfo.name.trim(),
        emails: processedEmails,
        address: clientInfo.address ? clientInfo.address.trim() : '',
        duration: clientInfo.duration ? clientInfo.duration.trim() : '',
      });
      finalClientId = client._id;
    }

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (color) project.color = color;
    if (members) project.members = members;
    if (finalClientId !== undefined) project.clientId = finalClientId || undefined;

    await project.save();

    const populated = await project.populate(['members', 'clientId']);
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
