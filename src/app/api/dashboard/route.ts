import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Employee from '@/models/Employee';
import Project from '@/models/Project';
import WorkEntry from '@/models/WorkEntry';
import Attendance from '@/models/Attendance';
import { currentUser } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    const user = await currentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });

    const employeeId = user.userType === 'employee' ? new mongoose.Types.ObjectId(user.id) : null;
    const projectQuery = employeeId ? { members: employeeId } : {};
    const workQuery = employeeId ? { employeeId } : {};
    const today = new Date().toISOString().split('T')[0];

    const [employees, projects, entries, employeeStats, projectStats, todayAttendances] = await Promise.all([
      Employee.find({}).select('name email role department status avatarColor userType').sort({ createdAt: -1 }).lean(),
      Project.find(projectQuery).populate('members', 'name role avatarColor').sort({ createdAt: -1 }).lean(),
      WorkEntry.find(workQuery).populate('projectId', 'name color').populate('employeeId', 'name avatarColor role').sort({ date: -1, startTime: -1 }).limit(100).lean(),
      WorkEntry.aggregate([{ $match: workQuery }, { $group: { _id: '$employeeId', totalMinutes: { $sum: '$actualTime' } } }]),
      WorkEntry.aggregate([{ $match: workQuery }, { $group: { _id: '$projectId', totalMinutes: { $sum: '$actualTime' }, entryCount: { $sum: 1 } } }]),
      Attendance.find({ date: today }).lean(),
    ]);

    const employeeTotals = new Map(employeeStats.map((item) => [item._id.toString(), item.totalMinutes]));
    const projectTotals = new Map(projectStats.map((item) => [item._id.toString(), item]));
    const attendanceMap = new Map(todayAttendances.map((att) => [att.employeeId.toString(), att]));

    return NextResponse.json(
      {
        success: true,
        data: {
          employees: employees.map((employee) => {
            const att = attendanceMap.get(employee._id.toString());
            return {
              ...employee,
              _id: employee._id.toString(),
              totalMinutes: employeeTotals.get(employee._id.toString()) ?? 0,
              todayAttendance: att ? {
                checkIn: att.checkIn || null,
                checkOut: att.checkOut || null,
                status: att.status,
                allowPunchInDate: att.allowPunchInDate || null,
                allowPunchOutDate: att.allowPunchOutDate || null,
              } : null,
            };
          }),
          projects: projects.map((project) => {
            const stats = projectTotals.get(project._id.toString());
            return { ...project, _id: project._id.toString(), totalMinutes: stats?.totalMinutes ?? 0, entryCount: stats?.entryCount ?? 0 };
          }),
          entries: entries.map((entry) => {
            const project = entry.projectId as unknown as { _id: mongoose.Types.ObjectId; name: string; color: string } | null;
            const employee = entry.employeeId as unknown as { _id: mongoose.Types.ObjectId; name: string; avatarColor: string; role: string } | null;
            return {
              ...entry,
              _id: entry._id.toString(),
              projectId: project?._id.toString() ?? '', projectName: project?.name ?? 'Unknown Project', projectColor: project?.color ?? '#cbd5e1',
              employeeId: employee?._id.toString() ?? '', employeeName: employee?.name ?? 'Unknown Employee', employeeAvatarColor: employee?.avatarColor ?? '#7f56d9', employeeRole: employee?.role ?? '',
            };
          }),
        },
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Dashboard request failed', error);
    return NextResponse.json({ success: false, error: 'Unable to load dashboard data' }, { status: 500 });
  }
}
