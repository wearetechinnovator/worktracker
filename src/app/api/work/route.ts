import { NextResponse } from 'next/server';
/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from '@/lib/dbConnect';
import TaskWork from '@/models/TaskWork';
import Task from '@/models/Task';
import Project from '@/models/Project';
import Employee from '@/models/Employee';
import { calculateElapsedMinutes } from '@/lib/time';
import { getPagination, paginatedResponse } from '@/lib/api';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    const taskId = searchParams.get('taskId');

    const query: Record<string, unknown> = {};
    const { page, limit, skip } = getPagination(searchParams);

    if (projectId) {
      if (projectId === 'none') {
        const tasks = await Task.find({
          $or: [
            { projectId: { $exists: false } },
            { projectId: null },
            { projectId: '' }
          ]
        }).select('_id').lean();
        const taskIds = tasks.map(t => t._id);
        query.taskId = { $in: taskIds };
      } else {
        const tasks = await Task.find({ projectId }).select('_id').lean();
        const taskIds = tasks.map(t => t._id);
        query.taskId = { $in: taskIds };
      }
    }

    if (taskId) {
      query.taskId = taskId;
    }

    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (startDate || endDate) {
      const dateRange: { $gte?: string; $lte?: string } = {};
      if (startDate) dateRange.$gte = startDate;
      if (endDate) dateRange.$lte = endDate;
      query.date = dateRange;
    }

    if (search) {
      const matchingTasks = await Task.find({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      }).select('_id').lean();
      const matchingTaskIds = matchingTasks.map(t => t._id);

      query.$or = [
        { notes: { $regex: search, $options: 'i' } },
        { taskId: { $in: matchingTaskIds } }
      ];
    }

    const [entries, total] = await Promise.all([
      TaskWork.find(query)
      .populate({
        path: 'taskId',
        populate: {
          path: 'projectId',
          model: 'Project',
          select: 'name color'
        }
      })
      .populate('employeeId', 'name avatarColor role')
      .sort({ date: -1, startTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
      TaskWork.countDocuments(query),
    ]);

    const formattedEntries = entries.map((entry: any) => {
      const task = entry.taskId;
      const proj = task?.projectId;
      const emp = entry.employeeId;
      return {
        _id: entry._id.toString(),
        projectId: proj ? proj._id.toString() : '',
        projectName: proj ? proj.name : (task?.Project || 'General'),
        projectColor: proj ? proj.color : '#7f56d9',
        employeeId: emp ? emp._id.toString() : (entry.employeeId?.toString() || ''),
        employeeName: emp ? emp.name : 'Unknown Employee',
        employeeAvatarColor: emp ? emp.avatarColor : '#7f56d9',
        employeeRole: emp ? emp.role : '',
        title: task ? task.title : 'Untitled Task',
        date: entry.date,
        startTime: entry.startTime,
        endTime: entry.endTime || '',
        actualTime: entry.totalMinutes || 0,
        description: entry.notes || '',
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    });

    return paginatedResponse(formattedEntries, page, limit, total);
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

    // Create a completed Task for this manual log
    const task = await Task.create({
      title,
      description: description || 'Manual work entry',
      projectId,
      assignedTo: [employeeId],
      status: 'Completed',
      priority: 'Medium',
      dueDate: date,
      createdBy: employeeId,
    });

    const taskWork = await TaskWork.create({
      taskId: task._id,
      employeeId,
      date,
      startTime: startTime.length === 5 ? startTime + ':00' : startTime,
      endTime: endTime.length === 5 ? endTime + ':00' : endTime,
      totalMinutes: actualTime,
      status: 'Completed',
      notes: description || undefined,
    });

    const proj = projectExists;
    const emp = employeeExists;

    const formattedEntry = {
      _id: taskWork._id.toString(),
      projectId: proj ? proj._id.toString() : '',
      projectName: proj ? proj.name : 'Unknown Project',
      projectColor: proj ? proj.color : '#cbd5e1',
      employeeId: emp ? emp._id.toString() : '',
      employeeName: emp ? emp.name : 'Unknown Employee',
      employeeAvatarColor: emp ? emp.avatarColor : '#7f56d9',
      employeeRole: emp ? emp.role : '',
      title: task.title,
      date: taskWork.date,
      startTime: taskWork.startTime,
      endTime: taskWork.endTime || '',
      actualTime: taskWork.totalMinutes || 0,
      description: taskWork.notes || '',
      createdAt: taskWork.createdAt,
      updatedAt: taskWork.updatedAt,
    };

    return NextResponse.json({ success: true, data: formattedEntry }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
