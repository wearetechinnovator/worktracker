import { NextResponse } from 'next/server';
/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from '@/lib/dbConnect';
import TaskWork from '@/models/TaskWork';
import Task from '@/models/Task';
import Project from '@/models/Project';
import Employee from '@/models/Employee';
import { calculateElapsedMinutes } from '@/lib/time';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { projectId, employeeId, title, date, startTime, endTime, description } = body;

    const entry = await TaskWork.findById(id);
    if (!entry) {
      return NextResponse.json({ success: false, error: 'Work session not found' }, { status: 404 });
    }

    if (employeeId) {
      const employeeExists = await Employee.findById(employeeId);
      if (!employeeExists) {
        return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
      }
      entry.employeeId = employeeId as any;
    }

    if (date) entry.date = date;
    if (startTime) entry.startTime = startTime;
    if (endTime) entry.endTime = endTime;
    if (description !== undefined) entry.notes = description;

    if (startTime || endTime) {
      entry.totalMinutes = calculateElapsedMinutes(entry.startTime, entry.endTime || '');
    }

    await entry.save();

    // If title or projectId is changed, update parent task
    if (title || projectId) {
      const task = await Task.findById(entry.taskId);
      if (task) {
        if (title) task.title = title;
        if (projectId) {
          const projectExists = await Project.findById(projectId);
          if (projectExists) {
            task.projectId = projectId as any;
          }
        }
        await task.save();
      }
    }

    const populated = await TaskWork.findById(entry._id)
      .populate({
        path: 'taskId',
        populate: {
          path: 'projectId',
          model: 'Project',
          select: 'name color'
        }
      })
      .populate('employeeId', 'name avatarColor role');

    const task = populated?.taskId as any;
    const proj = task?.projectId;
    const emp = populated?.employeeId as any;

    const formattedEntry = {
      _id: populated?._id.toString(),
      projectId: proj ? proj._id.toString() : '',
      projectName: proj ? proj.name : (task?.Project || 'General'),
      projectColor: proj ? proj.color : '#7f56d9',
      employeeId: emp ? emp._id.toString() : '',
      employeeName: emp ? emp.name : 'Unknown Employee',
      employeeAvatarColor: emp ? emp.avatarColor : '#7f56d9',
      employeeRole: emp ? emp.role : '',
      title: task ? task.title : 'Untitled Task',
      date: populated?.date,
      startTime: populated?.startTime,
      endTime: populated?.endTime || '',
      actualTime: populated?.totalMinutes || 0,
      description: populated?.notes || '',
      createdAt: populated?.createdAt,
      updatedAt: populated?.updatedAt,
    };

    return NextResponse.json({ success: true, data: formattedEntry });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const entry = await TaskWork.findByIdAndDelete(id);
    if (!entry) {
      return NextResponse.json({ success: false, error: 'Work session not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Work session deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
