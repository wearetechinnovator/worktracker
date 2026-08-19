/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Employee from '@/models/Employee';
import Attendance from '@/models/Attendance';
import { isErrorResponse, requireUser } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    // Get today's local date (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];

    const [employees, todayAttendances] = await Promise.all([
      Employee.find()
        .select('name email role Project status avatarColor userType')
        .sort({ name: 1 })
        .lean(),
      Attendance.find({ date: today }).lean(),
    ]);

    const attendanceMap = new Map(
      todayAttendances.map((att) => [att.employeeId.toString(), att])
    );

    const members = employees.map((emp) => {
      const att = attendanceMap.get(emp._id.toString());
      let onlineStatus = 'offline'; // offline, online, wfh, sick_leave, leave

      if (emp.userType === 'admin') {
        onlineStatus = 'online';
      } else if (att) {
        if (att.status === 'On Leave') {
          onlineStatus = 'leave';
        } else if (att.checkIn && !att.checkOut) {
          if (emp.status === 'Work From Home') {
            onlineStatus = 'wfh';
          } else if (emp.status === 'Sick Leave') {
            onlineStatus = 'sick_leave';
          } else {
            onlineStatus = 'online';
          }
        }
      }

      return {
        _id: emp._id.toString(),
        name: emp.name,
        email: emp.email,
        role: emp.role,
        Project: emp.Project,
        status: emp.status,
        avatarColor: emp.avatarColor,
        userType: emp.userType,
        onlineStatus,
      };
    });

    return NextResponse.json({ success: true, data: members });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
