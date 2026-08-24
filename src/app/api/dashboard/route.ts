import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Employee from '@/models/Employee';
import Project from '@/models/Project';
import WorkEntry from '@/models/WorkEntry';
import Attendance from '@/models/Attendance';
import TaskWork from '@/models/TaskWork';
import Task from '@/models/Task';
import { currentUser } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    const user = await currentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });

    const employeeId = user.userType === 'employee' ? new mongoose.Types.ObjectId(user.id) : null;
    const projectQuery = employeeId ? { members: employeeId } : {};
    const workQuery = employeeId ? { employeeId } : {};
    const taskQuery = employeeId
      ? {
          $or: [
            { assignedTo: { $in: [employeeId, user.id] } },
            { createdBy: employeeId },
          ],
        }
      : {};
    const today = new Date().toISOString().split('T')[0];

    const [
      employees,
      projects,
      entries,
      tasks,
      employeeStats,
      projectStats,
      todayAttendances,
      activeTaskWorks,
      todayWorkEntries,
    ] = await Promise.all([
      Employee.find({ userType: { $ne: 'admin' } }).select('name email role Project status avatarColor userType').sort({ createdAt: -1 }).lean(),
      Project.find(projectQuery).populate('members', 'name role avatarColor').sort({ createdAt: -1 }).lean(),
      WorkEntry.find(workQuery).populate('projectId', 'name color').populate('employeeId', 'name avatarColor role').sort({ date: -1, startTime: -1 }).limit(100).lean(),
      Task.find(taskQuery).select('status priority dueDate assignedTo projectId').lean(),
      WorkEntry.aggregate([{ $match: workQuery }, { $group: { _id: '$employeeId', totalMinutes: { $sum: '$actualTime' } } }]),
      WorkEntry.aggregate([{ $match: workQuery }, { $group: { _id: '$projectId', totalMinutes: { $sum: '$actualTime' }, entryCount: { $sum: 1 } } }]),
      Attendance.find({ date: today }).lean(),
      TaskWork.find({ date: today, status: 'In Progress' }).lean(),
      WorkEntry.find({ ...workQuery, date: today }).select('actualTime').lean(),
    ]);

    const employeeTotals = new Map(employeeStats.map((item) => [item._id.toString(), item.totalMinutes]));
    const projectTotals = new Map(projectStats.map((item) => [item._id.toString(), item]));
    const attendanceMap = new Map(todayAttendances.map((att) => [att.employeeId.toString(), att]));
    const activeEmployeeIds = new Set(activeTaskWorks.map((tw) => tw.employeeId.toString()));

    // Task calculations
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'In Progress').length;
    const todoTasks = tasks.filter((t) => t.status === 'To Do').length;
    const reviewTasks = tasks.filter((t) => t.status === 'Review').length;
    const activeTasks = totalTasks - completedTasks;

    // Employee calculations
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter((e) => e.status !== 'Inactive').length;
    const inactiveEmployees = employees.filter((e) => e.status === 'Inactive').length;
    const presentEmployees = todayAttendances.filter((att) => !!att.checkIn).length;
    const absentEmployees = Math.max(0, totalEmployees - presentEmployees);
    const checkedInEmployees = todayAttendances.filter((att) => !!att.checkIn && !att.checkOut).length;
    const checkedOutEmployees = todayAttendances.filter((att) => !!att.checkOut).length;
    const workingNowEmployees = activeTaskWorks.length;

    // Project calculations
    const totalProjects = projects.length;
    // Active project: has assigned members or logged work entries
    const activeProjects = projects.filter((p) => {
      const stats = projectTotals.get(p._id.toString());
      const hasMembers = Array.isArray(p.members) && p.members.length > 0;
      const hasEntries = (stats?.entryCount ?? 0) > 0;
      return hasMembers || hasEntries;
    }).length;
    const inactiveProjects = Math.max(0, totalProjects - activeProjects);

    // Productivity & Time
    const todayLoggedMinutes = todayWorkEntries.reduce((sum, item) => sum + (item.actualTime || 0), 0);
    const totalLoggedMinutes = employeeStats.reduce((sum, item) => sum + (item.totalMinutes || 0), 0);
    const attendanceRate = totalEmployees > 0 ? Math.round((presentEmployees / totalEmployees) * 100) : 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          stats: {
            employees: {
              total: totalEmployees,
              active: activeEmployees,
              inactive: inactiveEmployees,
              present: presentEmployees,
              absent: absentEmployees,
              checkedIn: checkedInEmployees,
              checkedOut: checkedOutEmployees,
              workingNow: workingNowEmployees,
              attendanceRate,
            },
            tasks: {
              total: totalTasks,
              active: activeTasks,
              inProgress: inProgressTasks,
              todo: todoTasks,
              review: reviewTasks,
              completed: completedTasks,
            },
            projects: {
              total: totalProjects,
              active: activeProjects,
              inactive: inactiveProjects,
              totalMinutes: totalLoggedMinutes,
            },
            productivity: {
              todayMinutes: todayLoggedMinutes,
              totalMinutes: totalLoggedMinutes,
              attendanceRate,
            },
          },
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
                isWorking: activeEmployeeIds.has(employee._id.toString()),
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
