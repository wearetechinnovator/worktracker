import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Task from '@/models/Task';
import { currentUser } from '@/lib/auth';

// POST /api/tasks/[id]/comments - Append comment to task
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await currentUser();
    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Valid task ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { comment, content, user_id, userId, newStatus, task_status } = body;

    const commentText = comment || content;
    if (!commentText || !commentText.trim()) {
      return NextResponse.json(
        { success: false, message: 'Comment content is required' },
        { status: 400 }
      );
    }

    const commentUserId = user_id || userId || user?._id;
    const newCommentObj = {
      comment: commentText.trim(),
      user_id: commentUserId && mongoose.Types.ObjectId.isValid(commentUserId) ? commentUserId : null,
      datetime: new Date()
    };

    const updateOps: Record<string, any> = {
      $push: { comments: newCommentObj },
      $set: { modified_on: new Date() }
    };

    if (user?._id) {
      updateOps.$set.modified_by = user._id;
    }

    const updatedTaskStatus = newStatus || task_status;
    if (updatedTaskStatus) {
      updateOps.$set.task_status = updatedTaskStatus;
    }

    const task = await Task.findByIdAndUpdate(id, updateOps, { new: true })
      .populate('project_id', 'name color')
      .populate('assign_to', 'full_name name email profile_picture avatarColor')
      .populate('created_by', 'full_name name email avatarColor')
      .populate('comments.user_id', 'full_name name email profile_picture avatarColor')
      .lean();

    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Comment added successfully',
      data: task
    });
  } catch (error: any) {
    console.error('ADD TASK COMMENT ERROR:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to add comment' },
      { status: 500 }
    );
  }
}
