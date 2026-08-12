import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Employee from '@/models/Employee';

export async function POST(request: Request) {
  try {
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

    // Dynamically seed default admin account if no admin exists
    const adminCount = await Employee.countDocuments({ userType: 'admin' });
    if (adminCount === 0) {
      await Employee.create({
        name: 'System Admin',
        email: 'admin@mail.com',
        role: 'Administrator',
        department: 'Management',
        status: 'Active',
        avatarColor: '#f43f5e',
        password: 'admin123',
        userType: 'admin'
      });
    }

    const employee = await Employee.findOne({ email: emailLower });
    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify plain-text password
    if (employee.password !== password) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

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

    return NextResponse.json({ success: true, data: userSession });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
