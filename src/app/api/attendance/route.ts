import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Attendance from '@/models/Attendance';
import Employee from '@/models/Employee';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const employeeId = searchParams.get('employeeId');

    if (employeeId) {
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
      }

      const records = await Attendance.find({ employeeId }).sort({ date: -1 }).limit(30);
      return NextResponse.json({
        success: true,
        data: {
          employee: {
            _id: employee._id,
            name: employee.name,
            email: employee.email,
            role: employee.role,
            department: employee.department,
            status: employee.status,
            avatarColor: employee.avatarColor,
            userType: employee.userType,
          },
          attendance: records.map((record) => ({
            _id: record._id,
            date: record.date,
            status: record.status,
            checkIn: record.checkIn || null,
            checkOut: record.checkOut || null,
            checkInIpAddress: record.checkInIpAddress || null,
            checkOutIpAddress: record.checkOutIpAddress || null,
            checkInLocation: record.checkInLocation || null,
            checkOutLocation: record.checkOutLocation || null,
            checkInLatitude: record.checkInLatitude ?? null,
            checkInLongitude: record.checkInLongitude ?? null,
            checkOutLatitude: record.checkOutLatitude ?? null,
            checkOutLongitude: record.checkOutLongitude ?? null,
          })),
        },
      });
    }

    if (!date) {
      return NextResponse.json({ success: false, error: 'Date parameter is required' }, { status: 400 });
    }

    const employees = await Employee.find({}).sort({ name: 1 });
    const attendanceRecords = await Attendance.find({ date });

    const attendanceMap = new Map(
      attendanceRecords.map(r => [r.employeeId.toString(), r])
    );

    const mergedData = employees.map(emp => {
      const record = attendanceMap.get(emp._id.toString());
      return {
        _id: emp._id.toString(),
        name: emp.name,
        role: emp.role,
        department: emp.department,
        avatarColor: emp.avatarColor,
        attendanceStatus: record ? record.status : 'Present', // Default to Present if not marked
        attendanceId: record ? record._id.toString() : null,
        checkIn: record?.checkIn || null,
        checkOut: record?.checkOut || null,
      };
    });

    return NextResponse.json({ success: true, data: mergedData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { records } = body;

    if (!records || !Array.isArray(records)) {
      return NextResponse.json(
        { success: false, error: 'Records array is required' },
        { status: 400 }
      );
    }

    const upsertPromises = records.map(async (record) => {
      const { employeeId, date, status } = record;
      if (!employeeId || !date || !status) return;

      return Attendance.findOneAndUpdate(
        { employeeId, date },
        { employeeId, date, status },
        { upsert: true, new: true }
      );
    });

    await Promise.all(upsertPromises);

    return NextResponse.json({ success: true, message: 'Attendance records updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
