import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import KeepNote from '@/models/KeepNote';
import { requireUser, isErrorResponse } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');

    const targetUserId =
      user.userType === 'admin' && requestedUserId ? requestedUserId : user.id;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return NextResponse.json({ success: false, error: 'Invalid user id' }, { status: 400 });
    }

    const notes = await KeepNote.find({ userId: targetUserId })
      .sort({ isPinned: -1, updatedAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: notes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    const body = await request.json();
    const { title, content, color, isPinned } = body;

    const normalizedTitle = typeof title === 'string' ? title.trim() : '';
    const normalizedContent = typeof content === 'string' ? content.trim() : '';

    if (!normalizedTitle || !normalizedContent) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const note = await KeepNote.create({
      userId: user.id,
      title: normalizedTitle,
      content: normalizedContent,
      color: typeof color === 'string' && color.trim() ? color.trim() : '#f8fafc',
      isPinned: Boolean(isPinned),
    });

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
