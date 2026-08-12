import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import WorkEntry from '@/models/WorkEntry';
import Project from '@/models/Project';
import Employee from '@/models/Employee';
import { calculateElapsedMinutes } from '@/lib/time';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    const query: any = {};

    if (projectId) {
      query.projectId = projectId;
    }

    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const entries = await WorkEntry.find(query)
      .populate('projectId', 'name color')
      .populate('employeeId', 'name avatarColor role')
      .sort({ date: -1, startTime: -1 });

    const formattedEntries = entries.map(entry => {
      const proj = entry.projectId as any;
      const emp = entry.employeeId as any;
      return {
        _id: entry._id.toString(),
        projectId: proj ? proj._id.toString() : (entry.projectId?.toString() || ''),
        projectName: proj ? proj.name : 'Unknown Project',
        projectColor: proj ? proj.color : '#cbd5e1',
        employeeId: emp ? emp._id.toString() : (entry.employeeId?.toString() || ''),
        employeeName: emp ? emp.name : 'Unknown Employee',
        employeeAvatarColor: emp ? emp.avatarColor : '#7f56d9',
        employeeRole: emp ? emp.role : '',
        title: entry.title,
        date: entry.date,
        startTime: entry.startTime,
        endTime: entry.endTime,
        actualTime: entry.actualTime,
        description: entry.description,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    });

    return NextResponse.json({ success: true, data: formattedEntries });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { projectId, employeeId, title, date, startTime, endTime, description } = body;

    if (!projectId || !employeeId || !title || !date || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'All fields (projectId, employeeId, title, date, startTime, endTime) are required' },
        { status: 400 }
      );
    }

    const [projectExists, employeeExists] = await Promise.all([
      Project.findById(projectId),
      Employee.findById(employeeId)
    ]);

    if (!projectExists) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    if (!employeeExists) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    const actualTime = calculateElapsedMinutes(startTime, endTime);

    const entry = await WorkEntry.create({
      projectId,
      employeeId,
      title,
      date,
      startTime,
      endTime,
      actualTime,
      description,
    });

    const populated = await entry.populate([
      { path: 'projectId', select: 'name color' },
      { path: 'employeeId', select: 'name avatarColor role' }
    ]);
    const proj = populated.projectId as any;
    const emp = populated.employeeId as any;

    const formattedEntry = {
      _id: populated._id.toString(),
      projectId: proj ? proj._id.toString() : (populated.projectId?.toString() || ''),
      projectName: proj ? proj.name : 'Unknown Project',
      projectColor: proj ? proj.color : '#cbd5e1',
      employeeId: emp ? emp._id.toString() : (populated.employeeId?.toString() || ''),
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

    return NextResponse.json({ success: true, data: formattedEntry }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
