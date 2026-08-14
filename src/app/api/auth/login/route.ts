import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Employee from '@/models/Employee';
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
    const { email, password } = body;

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
        department: 'Management',
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

    // Return session payload
    const userSession = {
      _id: employee._id.toString(),
      name: employee.name,
      email: employee.email,
      role: employee.role,
      userType: employee.userType,
      avatarColor: employee.avatarColor,
      department: employee.department
    };

    const { token, expiresAt } = createSession(employee._id.toString(), employee.userType);
    const response = NextResponse.json({ success: true, data: userSession });
    response.cookies.set(sessionCookie.name, token, { ...sessionCookie.options, expires: expiresAt });
    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
