import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Task from '@/models/Task';
import User from '@/models/User';
import { currentUser } from '@/lib/auth';

// GET /api/tasks/[id] - Retrieve task details
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await currentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Valid task ID is required' },
        { status: 400 }
      );
    }

    const accessFilter = Number(user.user_role) === 1
      ? { created_by: user._id }
      : { $or: [{ created_by: user._id }, { assign_to: user._id }] };

    const task = await Task.findOne({ _id: id, ...accessFilter })
      .populate('project_id', 'name color')
      .populate('assign_to', 'full_name name email profile_picture avatarColor')
      .populate('created_by', 'full_name name email avatarColor')
      .populate('modified_by', 'full_name name email')
      .populate('comments.user_id', 'full_name name email profile_picture avatarColor')
      .lean();

    if (!task || task.status === 0) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task
    });
  } catch (error: any) {
    console.error('GET TASK ERROR:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/[id] - Update task details
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await currentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Valid task ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const updateData: Record<string, any> = {};

    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = body.description;
    
    if (body.project_id !== undefined || body.projectId !== undefined) {
      const pId = body.project_id ?? body.projectId;
      updateData.project_id = pId && mongoose.Types.ObjectId.isValid(pId) ? pId : null;
    }

    if (body.assign_to !== undefined || body.assignedTo !== undefined) {
      const rawAssigned = body.assign_to ?? body.assignedTo;
      const requestedAssignedIds = Array.isArray(rawAssigned)
        ? rawAssigned
            .map((item: any) => (typeof item === 'object' && item !== null ? item._id : item))
            .filter((memberId: any) => typeof memberId === 'string' && mongoose.Types.ObjectId.isValid(memberId))
        : [];
      updateData.assign_to = Number(user.user_role) === 1
        ? await User.find({
            _id: { $in: requestedAssignedIds },
            user_role: 2,
            created_by: user._id,
          }).distinct('_id')
        : [user._id];
    }

    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.task_status !== undefined) updateData.task_status = body.task_status;
    else if (body.status !== undefined && typeof body.status === 'string') {
      updateData.task_status = body.status;
    }

    if (body.files !== undefined) updateData.files = Array.isArray(body.files) ? body.files : [];
    if (body.urls !== undefined) updateData.urls = Array.isArray(body.urls) ? body.urls : [];
    
    if (body.completion_date !== undefined || body.dueDate !== undefined) {
      const d = body.completion_date ?? body.dueDate;
      updateData.completion_date = d ? new Date(d) : null;
    }

    if (body.completion_time !== undefined || body.dueTime !== undefined) {
      updateData.completion_time = body.completion_time ?? body.dueTime ?? null;
    }

    if (body.status !== undefined && typeof body.status === 'number') {
      updateData.status = body.status;
    }

    // Set modified tracking fields
    if (user?._id) {
      updateData.modified_by = user._id;
    }
    updateData.modified_on = new Date();

    const accessFilter = Number(user.user_role) === 1
      ? { created_by: user._id }
      : { $or: [{ created_by: user._id }, { assign_to: user._id }] };

    const updatedTask = await Task.findOneAndUpdate({ _id: id, ...accessFilter }, updateData, {
      new: true,
      runValidators: true
    })
      .populate('project_id', 'name color')
      .populate('assign_to', 'full_name name email profile_picture avatarColor')
      .populate('created_by', 'full_name name email avatarColor')
      .populate('modified_by', 'full_name name email')
      .populate('comments.user_id', 'full_name name email profile_picture avatarColor')
      .lean();

    if (!updatedTask) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    });
  } catch (error: any) {
    console.error('UPDATE TASK ERROR:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Soft delete or delete task
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await currentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Valid task ID is required' },
        { status: 400 }
      );
    }

    // Mark as inactive (status: 0) for soft delete or remove
    const accessFilter = Number(user.user_role) === 1
      ? { created_by: user._id }
      : { $or: [{ created_by: user._id }, { assign_to: user._id }] };

    const deletedTask = await Task.findOneAndUpdate(
      { _id: id, ...accessFilter },
      { status: 0, modified_on: new Date() },
      { new: true }
    );

    if (!deletedTask) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error: any) {
    console.error('DELETE TASK ERROR:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to delete task' },
      { status: 500 }
    );
  }
}
