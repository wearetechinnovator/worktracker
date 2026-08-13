import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Attendance from '@/models/Attendance';
import Settings from '@/models/Settings';
import Employee from '@/models/Employee';

// Helper function to check if current time is within allowed window
function isWithinTimeWindow(currentTime: string, startTime: string, endTime: string): boolean {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const currentMinutes = toMinutes(currentTime);
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  // Overnight window: e.g. 14:00 - 12:00 means 14:00 to 23:59 and 00:00 to 12:00
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

// GET - Get punch status for today
export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const clientDate = searchParams.get('date');
    const clientTime = searchParams.get('time');

    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'Employee ID is required' }, { status: 400 });
    }

    const today = clientDate || new Date().toISOString().split('T')[0];
    const currentTime = clientTime || new Date().toTimeString().slice(0, 5); // HH:MM format

    // Check employee role
    const employee = await Employee.findById(employeeId);
    const isAdmin = employee?.userType === 'admin';

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

    // Determine what actions are allowed (currently checked in means checkIn exists and checkOut does not)
    const isCurrentlyCheckedIn = !!attendance?.checkIn && !attendance?.checkOut;

    const canPunchIn = isAdmin ? !isCurrentlyCheckedIn : (!isCurrentlyCheckedIn && isWithinTimeWindow(
      currentTime,
      settings.punchInStartTime,
      settings.punchInEndTime
    ));

    const canPunchOut = isAdmin ? isCurrentlyCheckedIn : (isCurrentlyCheckedIn && isWithinTimeWindow(
      currentTime,
      settings.punchOutStartTime,
      settings.punchOutEndTime
    ));

    return NextResponse.json({
      success: true,
      data: {
        attendance: attendance ? {
          checkIn: attendance.checkIn,
          checkOut: attendance.checkOut,
          status: attendance.status,
          checkInIpAddress: attendance.checkInIpAddress,
          checkInLocation: attendance.checkInLocation,
          checkInLatitude: attendance.checkInLatitude,
          checkInLongitude: attendance.checkInLongitude,
          checkOutIpAddress: attendance.checkOutIpAddress,
          checkOutLocation: attendance.checkOutLocation,
          checkOutLatitude: attendance.checkOutLatitude,
          checkOutLongitude: attendance.checkOutLongitude,
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
    const { employeeId, action, location, localDate, localTime } = body; // action: 'punchIn' or 'punchOut'

    if (!employeeId || !action) {
      return NextResponse.json(
        { success: false, error: 'Employee ID and action are required' },
        { status: 400 }
      );
    }

    // Check employee role
    const employee = await Employee.findById(employeeId);
    const isAdmin = employee?.userType === 'admin';

    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown';

    const today = localDate || new Date().toISOString().split('T')[0];
    const currentTime = localTime || new Date().toTimeString().slice(0, 5); // HH:MM format

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
      // Check if within punch in window (skipped for Admin)
      if (!isAdmin && !isWithinTimeWindow(currentTime, settings.punchInStartTime, settings.punchInEndTime)) {
        return NextResponse.json(
          {
            success: false,
            error: `Punch in is only allowed between ${settings.punchInStartTime} and ${settings.punchInEndTime}`,
          },
          { status: 400 }
        );
      }

      // Check if currently punched in (checkIn exists and checkOut does not)
      const existing = await Attendance.findOne({ employeeId, date: today });
      if (existing?.checkIn && !existing?.checkOut) {
        return NextResponse.json(
          { success: false, error: 'You are currently punched in' },
          { status: 400 }
        );
      }

      // Create or update attendance record (resets checkOut to allow re-punch in session)
      const attendance = await Attendance.findOneAndUpdate(
        { employeeId, date: today },
        {
          $set: {
            employeeId,
            date: today,
            status: 'Present',
            checkIn: currentTime,
            checkInIpAddress: ipAddress,
            checkInLocation: location?.label || location?.address || 'Location captured',
            checkInLatitude: location?.latitude ?? undefined,
            checkInLongitude: location?.longitude ?? undefined,
          },
          $unset: {
            checkOut: 1,
            checkOutIpAddress: 1,
            checkOutLocation: 1,
            checkOutLatitude: 1,
            checkOutLongitude: 1,
          },
        },
        { upsert: true, new: true }
      );

      return NextResponse.json({
        success: true,
        message: `Punched in successfully at ${currentTime}`,
        data: attendance,
      });
    } else if (action === 'punchOut') {
      // Check if within punch out window (skipped for Admin)
      if (!isAdmin && !isWithinTimeWindow(currentTime, settings.punchOutStartTime, settings.punchOutEndTime)) {
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

      // Update with punch out time, IP address, and Geolocation
      existing.checkOut = currentTime;
      existing.checkOutIpAddress = ipAddress;
      existing.checkOutLocation = location?.label || location?.address || (location?.latitude ? `${location.latitude}, ${location.longitude}` : 'Location captured');
      existing.checkOutLatitude = location?.latitude ?? undefined;
      existing.checkOutLongitude = location?.longitude ?? undefined;
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
