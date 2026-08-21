import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Employee from '@/models/Employee';
import Attendance from '@/models/Attendance';
import Settings from '@/models/Settings';
import { hashPassword, verifyPassword } from '@/lib/password';
import { createSession, sessionCookie } from '@/lib/session';

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function recordFailedAttempt(clientKey: string, attempt?: { count: number; resetAt: number }) {
  const isWithinWindow = attempt && attempt.resetAt > Date.now();
  attempts.set(clientKey, { count: isWithinWindow ? attempt.count + 1 : 1, resetAt: Date.now() + WINDOW_MS });
}

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientKey = forwardedFor?.split(',')[0]?.trim() || 'unknown';
    const attempt = attempts.get(clientKey);
    if (attempt && attempt.resetAt > Date.now() && attempt.count >= MAX_ATTEMPTS) {
      return NextResponse.json({ success: false, error: 'Too many login attempts. Try again later.' }, { status: 429 });
    }
    await dbConnect();
    const body = await request.json();
    const { email, password, location } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Bootstrap is explicit and environment-controlled; never create known credentials.
    const adminCount = await Employee.countDocuments({ userType: 'admin' });
    if (adminCount === 0) {
      const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
      const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
      if (!bootstrapEmail || !bootstrapPassword) {
        return NextResponse.json({ success: false, error: 'No administrator is configured. Contact the system owner.' }, { status: 503 });
      }
      await Employee.create({
        name: 'System Admin',
        email: bootstrapEmail.toLowerCase().trim(),
        role: 'Administrator',
        Project: 'Management',
        status: 'Active',
        avatarColor: '#f43f5e',
        password: await hashPassword(bootstrapPassword),
        userType: 'admin'
      });
    }

    const employee = await Employee.findOne({ email: emailLower });
    if (!employee) {
      recordFailedAttempt(clientKey, attempt);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!await verifyPassword(password, employee.password)) {
      recordFailedAttempt(clientKey, attempt);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Upgrade legacy plain-text credentials after a successful login.
    if (!employee.password.startsWith('scrypt:')) {
      employee.password = await hashPassword(password);
      await employee.save();
    }

    attempts.delete(clientKey);

    // Auto Punch In for standard employees
    if (employee.userType !== 'admin') {
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toTimeString().slice(0, 5); // HH:MM

      // Check if already checked in today
      const existingAttendance = await Attendance.findOne({ employeeId: employee._id, date: today });
      const isAllowedByAdmin = existingAttendance?.allowPunchInDate === today;

      if (existingAttendance?.checkOut && !isAllowedByAdmin) {
        // Case 1: Already punched out today and not override-allowed - Block login!
        return NextResponse.json(
          { success: false, error: 'Punch-in restricted: You have already completed your shift for today.' },
          { status: 403 }
        );
      }

      if (!existingAttendance?.checkIn || isAllowedByAdmin) {
        // Case 2: Not checked in yet (or admin explicitly allowed override) - Check shift hours window
        let settings = await Settings.findOne();
        if (!settings) {
          settings = await Settings.create({
            punchInStartTime: '00:00',
            punchInEndTime: '23:59',
            punchOutStartTime: '00:00',
            punchOutEndTime: '23:59',
          });
        }

        // Inline helper to validate time windows
        const isWithinWindow = (() => {
          const toMinutes = (time: string) => {
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
          };
          const currentMinutes = toMinutes(currentTime);
          const startMinutes = toMinutes(settings.punchInStartTime);
          const endMinutes = toMinutes(settings.punchInEndTime);
          if (startMinutes <= endMinutes) {
            return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
          }
          return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        })();

        if (isAllowedByAdmin || isWithinWindow) {
          // Auto Punch In
          const forwarded = request.headers.get('x-forwarded-for');
          const realIp = request.headers.get('x-real-ip');
          const ipAddress = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown';

          await Attendance.findOneAndUpdate(
            { employeeId: employee._id, date: today },
            {
              $set: {
                employeeId: employee._id,
                date: today,
                status: 'Present',
                checkIn: currentTime,
                checkInIpAddress: ipAddress,
                checkInLocation: location?.label || location?.address || (location?.latitude ? `${location.latitude}, ${location.longitude}` : null),
                checkInLatitude: location?.latitude ?? undefined,
                checkInLongitude: location?.longitude ?? undefined,
              },
              $unset: {
                checkOut: 1,
                checkOutIpAddress: 1,
                checkOutLocation: 1,
                checkOutLatitude: 1,
                checkOutLongitude: 1,
                allowPunchInDate: 1, // Consume the override
              },
            },
            { upsert: true }
          );
        } else {
          return NextResponse.json(
            { success: false, error: `Punch-in restricted: You are outside your allowed punch-in window (${settings.punchInStartTime} - ${settings.punchInEndTime}). Please contact your administrator.` },
            { status: 403 }
          );
        }
      }
      // Case 3: Checked in but not checked out - Allow login to resume session
    }

    // Return session payload
    const userSession = {
      _id: employee._id.toString(),
      name: employee.name,
      email: employee.email,
      role: employee.role,
      userType: employee.userType,
      avatarColor: employee.avatarColor,
      Project: employee.Project
    };

    const { token, expiresAt } = createSession(employee._id.toString(), employee.userType);
    const response = NextResponse.json({ success: true, data: userSession });
    response.cookies.set(sessionCookie.name, token, { ...sessionCookie.options, expires: expiresAt });
    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
