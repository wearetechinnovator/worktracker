import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Notification from '@/models/Notification';
import { requireUser, isErrorResponse } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.id;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const unreadCount = await Notification.countDocuments({ userId, read: false });

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (err: any) {
    console.error('Error fetching notifications:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    const body = await request.json();
    const { userId, title, message, type = 'task', link = '/tasks' } = body;

    if (!userId || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'userId, title, and message are required' },
        { status: 400 }
      );
    }

    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      link,
      read: false,
    });

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (err: any) {
    console.error('Error creating notification:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await Notification.updateMany({ userId: user.id, read: false }, { $set: { read: true } });
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (notificationId) {
      await Notification.findByIdAndUpdate(notificationId, { $set: { read: true } });
      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  } catch (err: any) {
    console.error('Error updating notification:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
