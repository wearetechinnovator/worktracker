import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Task from '@/models/Task';
import Employee from '@/models/Employee';
import { currentUser } from '@/lib/auth';

// GET - Get comments for a task
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;

    const task = await Task.findById(id)
      .populate('commentsList.author', 'name email avatarColor role')
      .select('comments commentsList');

    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: task.commentsList || [],
      legacyComments: task.comments,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Add a new comment / progress update to a task
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { content, userId } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { success: false, error: 'Comment content cannot be empty' },
        { status: 400 }
      );
    }

    // Determine acting user
    const sessionUser = await currentUser();
    const actingUserId = userId || sessionUser?.id || sessionUser?._id;

    if (!actingUserId) {
      return NextResponse.json(
        { success: false, error: 'User context is required to post a comment' },
        { status: 401 }
      );
    }

    let author = null;
    if (mongoose.Types.ObjectId.isValid(actingUserId)) {
      author = await Employee.findById(actingUserId);
    }
    if (!author) {
      author = await Employee.findOne({
        $or: [
          { email: actingUserId.toString().toLowerCase().trim() },
          ...(mongoose.Types.ObjectId.isValid(actingUserId) ? [{ _id: actingUserId }] : [])
        ]
      });
    }

    if (!author) {
      return NextResponse.json({ success: false, error: 'Author profile not found' }, { status: 404 });
    }

    const task = await Task.findById(id);
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    if (!task.commentsList) {
      task.commentsList = [];
    }

    const newComment = {
      author: author._id,
      content: content.trim(),
      createdAt: new Date(),
    };

    task.commentsList.push(newComment as any);

    // If a new status was optionally passed with the comment
    if (body.newStatus && ['To Do', 'In Progress', 'Partially Completed', 'Review', 'Completed'].includes(body.newStatus)) {
      task.status = body.newStatus;
    }

    await task.save();

    const populatedTask = await Task.findById(id)
      .populate('commentsList.author', 'name email avatarColor role')
      .select('comments commentsList status');

    return NextResponse.json({
      success: true,
      message: 'Comment posted successfully',
      data: populatedTask?.commentsList || [],
      taskStatus: populatedTask?.status,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error posting task comment:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
