import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import KeepNote from '@/models/KeepNote';
import { requireUser, isErrorResponse } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid note id' }, { status: 400 });
    }

    const body = await request.json();
    const { title, content, color, isPinned } = body;

    const note = await KeepNote.findOne({ _id: id, userId: user.id });
    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    if (typeof title === 'string' && title.trim()) note.title = title.trim();
    if (typeof content === 'string' && content.trim()) note.content = content.trim();
    if (typeof color === 'string' && color.trim()) note.color = color.trim();
    if (typeof isPinned === 'boolean') note.isPinned = isPinned;

    await note.save();

    return NextResponse.json({ success: true, data: note });
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
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid note id' }, { status: 400 });
    }

    const deleted = await KeepNote.findOneAndDelete({ _id: id, userId: user.id });
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Note deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
