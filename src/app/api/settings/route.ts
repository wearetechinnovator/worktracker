import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Settings from '@/models/Settings';

export async function GET() {
  try {
    await dbConnect();
    
    // Get settings or create default if doesn't exist
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        punchInStartTime: '09:00',
        punchInEndTime: '10:00',
        punchOutStartTime: '17:00',
        punchOutEndTime: '19:00',
      });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { punchInStartTime, punchInEndTime, punchOutStartTime, punchOutEndTime } = body;

    if (!punchInStartTime || !punchInEndTime || !punchOutStartTime || !punchOutEndTime) {
      return NextResponse.json(
        { success: false, error: 'All time fields are required' },
        { status: 400 }
      );
    }

    // Update or create settings
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        punchInStartTime,
        punchInEndTime,
        punchOutStartTime,
        punchOutEndTime,
      });
    } else {
      settings.punchInStartTime = punchInStartTime;
      settings.punchInEndTime = punchInEndTime;
      settings.punchOutStartTime = punchOutStartTime;
      settings.punchOutEndTime = punchOutEndTime;
      await settings.save();
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
