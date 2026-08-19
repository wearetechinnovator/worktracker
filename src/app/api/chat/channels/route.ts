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

    let query = {};
    if (user.userType !== 'admin') {
      query = {
        $or: [
          { allowedMembers: { $exists: false } },
          { allowedMembers: { $size: 0 } },
          { allowedMembers: user.id }
        ]
      };
    }

    const channels = await ChatChannel.find(query)
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
    const { name, description, allowMessages, allowAttachments, allowedMembers } = body;

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
      allowedMembers: Array.isArray(allowedMembers) ? allowedMembers : [],
    });

    return NextResponse.json({ success: true, data: channel }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/chat/channels:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    if (user.userType !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Only administrators can edit channels.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, description, allowMessages, allowAttachments, allowedMembers } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    const channel = await ChatChannel.findById(id);
    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'Channel not found' },
        { status: 404 }
      );
    }

    if (name && name.trim()) {
      const formattedName = name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-_]/g, '');

      if (formattedName !== channel.name) {
        // Check if name is already taken
        const existing = await ChatChannel.findOne({ name: formattedName });
        if (existing) {
          return NextResponse.json(
            { success: false, error: `Channel #${formattedName} already exists` },
            { status: 400 }
          );
        }

        // Update all message references to the new name
        const ChatMessage = (await import('@/models/ChatMessage')).default;
        await ChatMessage.updateMany({ channelId: `#${channel.name}` }, { channelId: `#${formattedName}` });

        channel.name = formattedName;
      }
    }

    if (description !== undefined) {
      channel.description = description.trim();
    }
    if (allowMessages) {
      channel.allowMessages = allowMessages;
    }
    if (allowAttachments) {
      channel.allowAttachments = allowAttachments;
    }
    if (allowedMembers) {
      channel.allowedMembers = allowedMembers;
    }

    await channel.save();
    return NextResponse.json({ success: true, data: channel });
  } catch (error: any) {
    console.error('Error in PUT /api/chat/channels:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    if (user.userType !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Only administrators can delete channels.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    const channel = await ChatChannel.findById(id);
    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'Channel not found' },
        { status: 404 }
      );
    }

    // Delete associated messages
    const ChatMessage = (await import('@/models/ChatMessage')).default;
    await ChatMessage.deleteMany({ channelId: `#${channel.name}` });

    await ChatChannel.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Channel deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /api/chat/channels:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
