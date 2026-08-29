import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Project';
import WorkEntry from '@/models/WorkEntry';
import Client from '@/models/Client';
import Task from '@/models/Task';
import Attendance from '@/models/Attendance';
import TaskWork from '@/models/TaskWork';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    const query = employeeId ? { members: employeeId } : {};

    // Fetch projects and populate their members
    const workMatch = employeeId && mongoose.Types.ObjectId.isValid(employeeId)
      ? { employeeId: new mongoose.Types.ObjectId(employeeId) }
      : {};
    const today = new Date().toISOString().split('T')[0];
    const [projects, stats, taskStats, todayAttendances, activeTaskWorks] = await Promise.all([
      Project.find(query)
        .populate('members', 'name role avatarColor status')
        .populate('clientId')
        .sort({ createdAt: -1 })
        .lean(),
      WorkEntry.aggregate<{ _id: string; totalMinutes: number; entryCount: number }>([
        { $match: workMatch },
        { $group: { _id: '$projectId', totalMinutes: { $sum: '$actualTime' }, entryCount: { $sum: 1 } } },
      ]),
      Task.aggregate<{ _id: string; taskCount: number }>([
        { $match: { status: { $ne: 'Completed' } } },
        { $group: { _id: '$projectId', taskCount: { $sum: 1 } } },
      ]),
      Attendance.find({ date: today }).lean(),
      TaskWork.find({ date: today, status: 'In Progress' }).lean(),
    ]);
    const statsByProject = new Map(stats.map((stat) => [stat._id.toString(), stat]));
    const taskCountMap = new Map(taskStats.map((t) => [t._id ? t._id.toString() : '', t.taskCount]));

    const punchedInSet = new Set(
      todayAttendances
        .filter((att) => !!att.checkIn && !att.checkOut)
        .map((att) => att.employeeId.toString())
    );
    const workingSet = new Set(
      activeTaskWorks.map((tw) => tw.employeeId.toString())
    );

    const projectsWithStats = projects.map((project) => {
        const stat = statsByProject.get(project._id.toString());

        return {
          _id: project._id.toString(),
          name: project.name,
          description: project.description,
          color: project.color,
          members: project.members.map((m: any) => {
            const empId = m._id ? m._id.toString() : '';
            const isPunchedIn = punchedInSet.has(empId);
            const isWorking = workingSet.has(empId);

            let presenceState: 'working' | 'idle' | 'offline' = 'offline';
            if (isWorking) {
              presenceState = 'working';
            } else if (isPunchedIn) {
              presenceState = 'idle';
            }

            return {
              _id: empId,
              name: m.name,
              role: m.role,
              avatarColor: m.avatarColor,
              status: m.status || 'Active',
              isOnline: isPunchedIn,
              presenceState,
            };
          }),
          clientId: project.clientId ? {
            _id: (project.clientId as any)._id.toString(),
            name: (project.clientId as any).name,
            emails: (project.clientId as any).emails,
            address: (project.clientId as any).address,
            duration: (project.clientId as any).duration,
          } : null,
          totalMinutes: stat?.totalMinutes ?? 0,
          entryCount: stat?.entryCount ?? 0,
          taskCount: taskCountMap.get(project._id.toString()) || 0,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        };
      });

    return NextResponse.json({ success: true, data: projectsWithStats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { requirePermission, isErrorResponse } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const authUser = await requirePermission('projects:create');
    if (isErrorResponse(authUser)) return authUser;

    const body = await request.json();
    const { name, description, color, members, clientId, clientInfo } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Project name is required' }, { status: 400 });
    }

    let finalClientId = clientId;
    if (clientInfo && clientInfo.name && clientInfo.name.trim()) {
      let processedEmails: string[] = [];
      if (Array.isArray(clientInfo.emails)) {
        processedEmails = clientInfo.emails.map((e: any) => String(e).trim()).filter(Boolean);
      } else if (typeof clientInfo.emails === 'string') {
        processedEmails = clientInfo.emails.split(',').map((e: string) => e.trim()).filter(Boolean);
      }

      let processedContacts: any[] = [];
      if (Array.isArray(clientInfo.contacts)) {
        processedContacts = clientInfo.contacts
          .filter((c: any) => c && (c.name || c.email || c.phone || c.designation))
          .map((c: any) => ({
            name: String(c.name || '').trim(),
            email: String(c.email || '').trim().toLowerCase(),
            phone: String(c.phone || '').trim(),
            designation: String(c.designation || '').trim(),
          }));
      }

      const client = await Client.create({
        name: clientInfo.name.trim(),
        phone: clientInfo.phone ? clientInfo.phone.trim() : undefined,
        emails: processedEmails,
        address: clientInfo.address ? clientInfo.address.trim() : '',
        duration: clientInfo.duration ? clientInfo.duration.trim() : '',
        contacts: processedContacts,
      });
      finalClientId = client._id;
    }

    const project = await Project.create({
      name,
      description,
      color,
      members: members || [],
      clientId: finalClientId || undefined,
    });

    const populated = await project.populate(['members', 'clientId']);

    return NextResponse.json({
      success: true,
      data: {
        _id: populated._id.toString(),
        name: populated.name,
        description: populated.description,
        color: populated.color,
        members: populated.members.map((m: any) => ({
          _id: m._id.toString(),
          name: m.name,
          role: m.role,
          avatarColor: m.avatarColor,
        })),
        clientId: populated.clientId ? {
          _id: (populated.clientId as any)._id.toString(),
          name: (populated.clientId as any).name,
          emails: (populated.clientId as any).emails,
          address: (populated.clientId as any).address,
          duration: (populated.clientId as any).duration,
        } : null,
        totalMinutes: 0,
        entryCount: 0,
        createdAt: populated.createdAt,
        updatedAt: populated.updatedAt,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
