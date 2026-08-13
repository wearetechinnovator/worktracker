import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Attendance from '@/models/Attendance';
import Settings from '@/models/Settings';

// Helper function to check if current time is within allowed window
function isWithinTimeWindow(currentTime: string, startTime: string, endTime: string): boolean {
  const current = currentTime.split(':').map(Number);
  const start = startTime.split(':').map(Number);
  const end = endTime.split(':').map(Number);

  const currentMinutes = current[0] * 60 + current[1];
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

// GET - Get punch status for today
export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'Employee ID is required' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().slice(0, 5); // HH:MM format

    // Get settings
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        punchInStartTime: '00:00',
        punchInEndTime: '23:59',
        punchOutStartTime: '00:00',
        punchOutEndTime: '23:59',
      });
    }

    // Check if attendance record exists for today
    const attendance = await Attendance.findOne({ employeeId, date: today });

    // Determine what actions are allowed
    const canPunchIn = !attendance?.checkIn && isWithinTimeWindow(
      currentTime,
      settings.punchInStartTime,
      settings.punchInEndTime
    );

    const canPunchOut = attendance?.checkIn && !attendance?.checkOut && isWithinTimeWindow(
      currentTime,
      settings.punchOutStartTime,
      settings.punchOutEndTime
    );

    return NextResponse.json({
      success: true,
      data: {
        attendance: attendance ? {
          checkIn: attendance.checkIn,
          checkOut: attendance.checkOut,
          status: attendance.status,
        } : null,
        canPunchIn,
        canPunchOut,
        currentTime,
        settings: {
          punchInWindow: `${settings.punchInStartTime} - ${settings.punchInEndTime}`,
          punchOutWindow: `${settings.punchOutStartTime} - ${settings.punchOutEndTime}`,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Punch In or Punch Out
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { employeeId, action, location } = body; // action: 'punchIn' or 'punchOut'

    if (!employeeId || !action) {
      return NextResponse.json(
        { success: false, error: 'Employee ID and action are required' },
        { status: 400 }
      );
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown';

    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().slice(0, 5); // HH:MM format

    // Get settings
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        punchInStartTime: '00:00',
        punchInEndTime: '23:59',
        punchOutStartTime: '00:00',
        punchOutEndTime: '23:59',
      });
    }

    if (action === 'punchIn') {
      // Check if within punch in window
      if (!isWithinTimeWindow(currentTime, settings.punchInStartTime, settings.punchInEndTime)) {
        return NextResponse.json(
          {
            success: false,
            error: `Punch in is only allowed between ${settings.punchInStartTime} and ${settings.punchInEndTime}`,
          },
          { status: 400 }
        );
      }

      // Check if already punched in
      const existing = await Attendance.findOne({ employeeId, date: today });
      if (existing?.checkIn) {
        return NextResponse.json(
          { success: false, error: 'You have already punched in today' },
          { status: 400 }
        );
      }

      // Create or update attendance record
      const attendance = await Attendance.findOneAndUpdate(
        { employeeId, date: today },
        {
          employeeId,
          date: today,
          status: 'Present',
          checkIn: currentTime,
          checkInIpAddress: ipAddress,
          checkInLocation: location?.label || location?.address || 'Location captured',
          checkInLatitude: location?.latitude ?? undefined,
          checkInLongitude: location?.longitude ?? undefined,
        },
        { upsert: true, new: true }
      );

      return NextResponse.json({
        success: true,
        message: `Punched in successfully at ${currentTime}`,
        data: attendance,
      });
    } else if (action === 'punchOut') {
      // Check if within punch out window
      if (!isWithinTimeWindow(currentTime, settings.punchOutStartTime, settings.punchOutEndTime)) {
        return NextResponse.json(
          {
            success: false,
            error: `Punch out is only allowed between ${settings.punchOutStartTime} and ${settings.punchOutEndTime}`,
          },
          { status: 400 }
        );
      }

      // Check if punched in
      const existing = await Attendance.findOne({ employeeId, date: today });
      if (!existing?.checkIn) {
        return NextResponse.json(
          { success: false, error: 'You must punch in before punching out' },
          { status: 400 }
        );
      }

      if (existing.checkOut) {
        return NextResponse.json(
          { success: false, error: 'You have already punched out today' },
          { status: 400 }
        );
      }

      // Update with punch out time
      existing.checkOut = currentTime;
      existing.checkOutIpAddress = ipAddress;
      existing.checkOutLocation = location?.label || location?.address || 'Location captured';
      existing.checkOutLatitude = location?.latitude ?? existing.checkOutLatitude;
      existing.checkOutLongitude = location?.longitude ?? existing.checkOutLongitude;
      await existing.save();

      return NextResponse.json({
        success: true,
        message: `Punched out successfully at ${currentTime}`,
        data: existing,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "punchIn" or "punchOut"' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
