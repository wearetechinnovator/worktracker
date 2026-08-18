import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import TaskWork from '@/models/TaskWork';
import Task from '@/models/Task';
import { getPagination, paginatedResponse } from '@/lib/api';

// GET - Get task work records
export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const taskId = searchParams.get('taskId');
    const date = searchParams.get('date');

    const query: Record<string, unknown> = {};
    const { page, limit, skip } = getPagination(searchParams);

    if (employeeId) query.employeeId = employeeId;
    if (taskId) query.taskId = taskId;
    if (date) query.date = date;

    const [taskWorks, total] = await Promise.all([
      TaskWork.find(query)
      .populate('taskId', 'title description priority status')
      .populate('employeeId', 'name email avatarColor')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
      TaskWork.countDocuments(query),
    ]);

    return paginatedResponse(taskWorks, page, limit, total);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Start work on a task
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { taskId, employeeId, notes, localDate, localTime } = body;

    if (!taskId || !employeeId) {
      return NextResponse.json(
        { success: false, error: 'Task ID and Employee ID are required' },
        { status: 400 }
      );
    }

    // Check if task exists
    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Check if employee is assigned to this task
    const isAssigned = task.assignedTo.some((id: any) => id.toString() === employeeId);
    if (!isAssigned) {
      return NextResponse.json(
        { success: false, error: 'You are not assigned to this task' },
        { status: 403 }
      );
    }

    const today = localDate || new Date().toISOString().split('T')[0];
    const currentTime = localTime || new Date().toTimeString().slice(0, 8); // HH:MM:SS

    // Check if there's already an in-progress work session for this task today
    const existingWork = await TaskWork.findOne({
      taskId,
      employeeId,
      date: today,
      status: 'In Progress',
    });

    if (existingWork) {
      return NextResponse.json(
        { success: false, error: 'You already have an active work session for this task' },
        { status: 400 }
      );
    }

    // Create new work session
    const taskWork = await TaskWork.create({
      taskId,
      employeeId,
      date: today,
      startTime: currentTime,
      status: 'In Progress',
      notes: notes || undefined,
    });

    // Update parent task status to In Progress
    if (task.status !== 'In Progress') {
      task.status = 'In Progress';
      await task.save();
    }

    const populatedWork = await TaskWork.findById(taskWork._id)
      .populate('taskId', 'title description priority status')
      .populate('employeeId', 'name email avatarColor');

    return NextResponse.json({
      success: true,
      message: 'Work started successfully',
      data: populatedWork,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
