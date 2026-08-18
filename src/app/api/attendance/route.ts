import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Attendance from '@/models/Attendance';
import Employee from '@/models/Employee';
import { isErrorResponse, requireUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const employeeId = searchParams.get('employeeId');

    const month = searchParams.get('month'); // YYYY-MM

    if (employeeId) {
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
      }

      let query: any = { employeeId };
      if (month) {
        query.date = { $regex: `^${month}` };
      }

      const recordsQuery = Attendance.find(query).sort({ date: 1 });
      if (!month) {
        recordsQuery.limit(60);
      }
      const records = await recordsQuery;

      return NextResponse.json({
        success: true,
        data: {
          employee: {
            _id: employee._id,
            name: employee.name,
            email: employee.email,
            role: employee.role,
            Project: employee.Project,
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
      const filterEmployeeId = user.userType === 'admin' ? searchParams.get('filterEmployeeId') : user.id;
      const filterStatus = searchParams.get('filterStatus');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      const query: any = {};
      if (filterEmployeeId) {
        query.employeeId = filterEmployeeId;
      }
      if (filterStatus) {
        query.status = filterStatus;
      }
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
      }

      const records = await Attendance.find(query)
        .populate('employeeId', 'name role avatarColor Project')
        .sort({ date: -1, createdAt: -1 })
        .lean();

      return NextResponse.json({ success: true, data: records });
    }

    const employees = await Employee.find({ userType: { $ne: 'admin' } }).sort({ name: 1 });
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
        Project: emp.Project,
        avatarColor: emp.avatarColor,
        attendanceStatus: record ? record.status : 'Present', // Default to Present if not marked
        attendanceId: record ? record._id.toString() : null,
        checkIn: record?.checkIn || null,
        checkOut: record?.checkOut || null,
        checkInIpAddress: record?.checkInIpAddress || null,
        checkInLocation: record?.checkInLocation || null,
        checkInLatitude: record?.checkInLatitude ?? null,
        checkInLongitude: record?.checkInLongitude ?? null,
        checkOutIpAddress: record?.checkOutIpAddress || null,
        checkOutLocation: record?.checkOutLocation || null,
        checkOutLatitude: record?.checkOutLatitude ?? null,
        checkOutLongitude: record?.checkOutLongitude ?? null,
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
      const { employeeId, date, status, checkIn, checkOut, checkInLocation, checkOutLocation } = record;
      if (!employeeId || !date || !status) return;

      const updateData: Record<string, any> = { employeeId, date, status };
      if (checkIn !== undefined) updateData.checkIn = checkIn || null;
      if (checkOut !== undefined) updateData.checkOut = checkOut || null;
      if (checkInLocation !== undefined) updateData.checkInLocation = checkInLocation;
      if (checkOutLocation !== undefined) updateData.checkOutLocation = checkOutLocation;

      return Attendance.findOneAndUpdate(
        { employeeId, date },
        { $set: updateData },
        { upsert: true, new: true }
      );
    });

    await Promise.all(upsertPromises);

    return NextResponse.json({ success: true, message: 'Attendance records updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
