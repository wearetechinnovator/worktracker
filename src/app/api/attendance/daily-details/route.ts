import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Attendance from '@/models/Attendance';
import Employee from '@/models/Employee';
import WorkEntry from '@/models/WorkEntry';
import TaskWork from '@/models/TaskWork';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date'); // YYYY-MM-DD

    if (!employeeId || !date) {
      return NextResponse.json(
        { success: false, error: 'Both employeeId and date parameters are required' },
        { status: 400 }
      );
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    // 1. Fetch Attendance record
    const attendanceRecord = await Attendance.findOne({ employeeId, date });

    // 2. Fetch Work Entries for this employee on this date
    const workEntriesRaw = await WorkEntry.find({ employeeId, date })
      .populate('projectId', 'name color')
      .sort({ startTime: 1 });

    const workEntries = workEntriesRaw.map((entry) => {
      const proj = entry.projectId as any;
      return {
        _id: entry._id.toString(),
        title: entry.title,
        date: entry.date,
        startTime: entry.startTime,
        endTime: entry.endTime,
        actualTime: entry.actualTime,
        description: entry.description || '',
        projectName: proj ? proj.name : 'Unassigned Project',
        projectColor: proj ? proj.color : '#64748b',
      };
    });

    // 3. Fetch Task Work sessions for this employee on this date
    const taskWorksRaw = await TaskWork.find({ employeeId, date })
      .populate('taskId', 'title description priority status Project')
      .sort({ createdAt: 1 });

    const taskWorks = taskWorksRaw.map((tw) => {
      const task = tw.taskId as any;
      return {
        _id: tw._id.toString(),
        taskId: task ? task._id.toString() : (tw.taskId?.toString() || ''),
        taskTitle: task ? task.title : 'Task',
        taskDescription: task ? task.description : '',
        taskPriority: task ? task.priority : 'Medium',
        taskStatus: task ? task.status : 'In Progress',
        Project: task ? task.Project : '',
        startTime: tw.startTime,
        endTime: tw.endTime || null,
        totalMinutes: tw.totalMinutes || 0,
        status: tw.status,
        notes: tw.notes || '',
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        employee: {
          _id: employee._id.toString(),
          name: employee.name,
          email: employee.email,
          role: employee.role,
          Project: employee.Project,
          status: employee.status,
          avatarColor: employee.avatarColor,
          userType: employee.userType,
        },
        date,
        attendance: attendanceRecord
          ? {
              _id: attendanceRecord._id.toString(),
              date: attendanceRecord.date,
              status: attendanceRecord.status,
              checkIn: attendanceRecord.checkIn || null,
              checkOut: attendanceRecord.checkOut || null,
              checkInIpAddress: attendanceRecord.checkInIpAddress || null,
              checkOutIpAddress: attendanceRecord.checkOutIpAddress || null,
              checkInLocation: attendanceRecord.checkInLocation || null,
              checkOutLocation: attendanceRecord.checkOutLocation || null,
              checkInLatitude: attendanceRecord.checkInLatitude ?? null,
              checkInLongitude: attendanceRecord.checkInLongitude ?? null,
              checkOutLatitude: attendanceRecord.checkOutLatitude ?? null,
              checkOutLongitude: attendanceRecord.checkOutLongitude ?? null,
            }
          : null,
        workEntries,
        taskWorks,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
