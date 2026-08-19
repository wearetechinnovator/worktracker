/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ChatChannel from '@/models/ChatChannel';
import { isErrorResponse, requireUser } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    const channels = await ChatChannel.find()
      .populate('createdBy', 'name')
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ success: true, data: channels });
  } catch (error: any) {
    console.error('Error in GET /api/chat/channels:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    if (user.userType !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Only administrators can create channels.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, allowMessages, allowAttachments } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Channel name is required' },
        { status: 400 }
      );
    }

    // Format name: lowercase, replace spaces with hyphens, remove special characters
    const formattedName = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-_]/g, '');

    if (!formattedName) {
      return NextResponse.json(
        { success: false, error: 'Invalid channel name' },
        { status: 400 }
      );
    }

    // Check if channel already exists
    const existing = await ChatChannel.findOne({ name: formattedName });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Channel #${formattedName} already exists` },
        { status: 400 }
      );
    }

    const channel = await ChatChannel.create({
      name: formattedName,
      description: description?.trim() || '',
      createdBy: user.id,
      allowMessages: allowMessages === 'admin_only' ? 'admin_only' : 'anyone',
      allowAttachments: allowAttachments === 'admin_only' ? 'admin_only' : 'anyone',
    });

    return NextResponse.json({ success: true, data: channel }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/chat/channels:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
