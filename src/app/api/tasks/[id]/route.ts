import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Task from '@/models/Task';
import Employee from '@/models/Employee';

// GET - Get single task
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;

    const task = await Task.findById(id)
      .populate('assignedTo', 'name email avatarColor role department')
      .populate('createdBy', 'name email')
      .populate('projectId', 'name color description');

    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: task });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update task
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const task = await Task.findById(id);
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    const actingUserId = body.userId || body.requestedBy || body.createdBy;
    if (!actingUserId) {
      return NextResponse.json(
        { success: false, error: 'User context is required to update this task' },
        { status: 403 }
      );
    }

    const actingUser = await Employee.findById(actingUserId);
    if (!actingUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const isAdmin = actingUser.userType === 'admin';
    const isTaskCreator = task.createdBy?.toString() === actingUserId.toString();
    if (!isAdmin && !isTaskCreator) {
      return NextResponse.json(
        { success: false, error: 'You can only edit tasks you created' },
        { status: 403 }
      );
    }

    // Update fields
    const allowedFields = [
      'title',
      'description',
      'projectId',
      'department',
      'assignedTo',
      'priority',
      'status',
      'dueDate',
      'tags',
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        (task as any)[field] = body[field];
      }
    });

    await task.save();

    const updatedTask = await Task.findById(id)
      .populate('assignedTo', 'name email avatarColor')
      .populate('createdBy', 'name email')
      .populate('projectId', 'name color');

    return NextResponse.json({ success: true, data: updatedTask });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// DELETE - Delete task
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || (await request.json().catch(() => null))?.userId;

    const task = await Task.findById(id);
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User context is required to delete this task' },
        { status: 403 }
      );
    }

    const actingUser = await Employee.findById(userId);
    if (!actingUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const isAdmin = actingUser.userType === 'admin';
    const isTaskCreator = task.createdBy?.toString() === userId.toString();
    if (!isAdmin && !isTaskCreator) {
      return NextResponse.json(
        { success: false, error: 'You can only delete tasks you created' },
        { status: 403 }
      );
    }

    await Task.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Task deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
