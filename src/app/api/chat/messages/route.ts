/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ChatMessage from '@/models/ChatMessage';
import Employee from '@/models/Employee';
import { isErrorResponse, requireUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    const since = searchParams.get('since');

    if (!channelId) {
      const allowedChannels = ['#general', '#random', '#announcements'];
      const Project = (await import('@/models/Project')).default;
      const userProjects = user.userType === 'admin'
        ? await Project.find().select('_id').lean()
        : await Project.find({ members: user.id }).select('_id').lean();

      userProjects.forEach((p: any) => {
        allowedChannels.push(`project-${p._id.toString()}`);
      });

      const query: any = {
        $or: [
          { channelId: { $in: allowedChannels } },
          { channelId: { $regex: user.id } }
        ]
      };

      if (since) {
        query.createdAt = { $gt: new Date(since) };
      } else {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        query.createdAt = { $gt: oneDayAgo };
      }

      const messages = await ChatMessage.find(query)
        .sort({ createdAt: 1 })
        .lean();

      return NextResponse.json({ success: true, data: messages });
    }

    const query: { channelId: string; createdAt?: { $gt: Date } } = { channelId };

    if (since) {
      query.createdAt = { $gt: new Date(since) };
      // Fetch all messages since the timestamp
      const messages = await ChatMessage.find(query)
        .sort({ createdAt: 1 })
        .lean();
      return NextResponse.json({ success: true, data: messages });
    } else {
      // Fetch latest 50 messages
      const messages = await ChatMessage.find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      
      // Reverse to get them in chronological order
      return NextResponse.json({ success: true, data: messages.reverse() });
    }
  } catch (error: any) {
    console.error('Error in GET /api/chat/messages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    const body = await request.json();
    const { channelId, content, replyToId, replyToSenderName, replyToContent, attachments } = body;

    const hasAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;
    if (!channelId || ((!content || !content.trim()) && !hasAttachments)) {
      return NextResponse.json(
        { success: false, error: 'channelId and content are required' },
        { status: 400 }
      );
    }

    // Fetch employee details to denormalize sender details
    const employee = await Employee.findById(user.id)
      .select('name avatarColor role')
      .lean();

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Sender profile not found' },
        { status: 404 }
      );
    }

    const message = await ChatMessage.create({
      channelId,
      senderId: employee._id,
      senderName: employee.name,
      senderAvatarColor: employee.avatarColor || '#3b82f6',
      senderRole: employee.role,
      content: content.trim() || ' ',
      reactions: [],
      replyToId: replyToId || undefined,
      replyToSenderName: replyToSenderName || undefined,
      replyToContent: replyToContent || undefined,
      attachments: attachments || undefined,
    });

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/chat/messages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    const body = await request.json();
    const { messageId, emoji } = body;

    if (!messageId || !emoji) {
      return NextResponse.json(
        { success: false, error: 'messageId and emoji are required' },
        { status: 400 }
      );
    }

    const message = await ChatMessage.findById(messageId);
    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    const userIdStr = user.id;

    // Check if the reaction list has the emoji
    const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);

    if (reactionIndex > -1) {
      const reaction = message.reactions[reactionIndex];
      const userIndex = reaction.users.indexOf(userIdStr);

      if (userIndex > -1) {
        // User already reacted, remove user
        reaction.users.splice(userIndex, 1);
        // If no users left for this emoji, remove the emoji reaction entry
        if (reaction.users.length === 0) {
          message.reactions.splice(reactionIndex, 1);
        }
      } else {
        // User hasn't reacted, add user
        reaction.users.push(userIdStr);
      }
    } else {
      // New emoji reaction
      message.reactions.push({
        emoji,
        users: [userIdStr],
      });
    }

    await message.save();

    return NextResponse.json({ success: true, data: message });
  } catch (error: any) {
    console.error('Error in PATCH /api/chat/messages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
