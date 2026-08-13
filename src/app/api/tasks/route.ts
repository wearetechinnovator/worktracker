import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Task from '@/models/Task';
import Employee from '@/models/Employee';
import Project from '@/models/Project';
import mongoose from 'mongoose';

// GET - Fetch all tasks or filtered tasks
export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const projectId = searchParams.get('projectId');
    const department = searchParams.get('department');
    const status = searchParams.get('status');

    let query: any = {};

    // Filter by assigned employee
    if (employeeId) {
      query.assignedTo = employeeId;
    }

    // Filter by project
    if (projectId) {
      query.projectId = projectId;
    }

    // Filter by department
    if (department) {
      query.department = department;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email avatarColor')
      .populate('createdBy', 'name email')
      .populate('projectId', 'name color')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create a new task
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const {
      title,
      description,
      projectId,
      department,
      assignedTo,
      createdBy,
      priority,
      status,
      dueDate,
      tags,
    } = body;

    // Validation
    if (!title || !createdBy) {
      return NextResponse.json(
        { success: false, error: 'Title and creator are required' },
        { status: 400 }
      );
    }

    // Must have either projectId or department
    if (!projectId && !department) {
      return NextResponse.json(
        { success: false, error: 'Either project or department must be specified' },
        { status: 400 }
      );
    }

    // Validate createdBy is an admin or the employee themselves
    const creator = await Employee.findById(createdBy);
    if (!creator) {
      return NextResponse.json(
        { success: false, error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Allow admin to create tasks, or allow employees to create tasks for themselves
    const isAdmin = creator.userType === 'admin';
    const isSelfAssignment = assignedTo && assignedTo.length === 1 && assignedTo[0] === createdBy;
    
    if (!isAdmin && !isSelfAssignment) {
      return NextResponse.json(
        { success: false, error: 'Employees can only create tasks assigned to themselves' },
        { status: 403 }
      );
    }

    // Validate projectId if provided
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        );
      }
    }

    // Validate assigned employees
    if (assignedTo && assignedTo.length > 0) {
      const employees = await Employee.find({ _id: { $in: assignedTo } });
      if (employees.length !== assignedTo.length) {
        return NextResponse.json(
          { success: false, error: 'One or more assigned employees not found' },
          { status: 404 }
        );
      }
    }

    const task = await Task.create({
      title,
      description,
      projectId: projectId || undefined,
      department: department || undefined,
      assignedTo: assignedTo || [],
      createdBy,
      priority: priority || 'Medium',
      status: status || 'To Do',
      dueDate,
      tags: tags || [],
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatarColor')
      .populate('createdBy', 'name email')
      .populate('projectId', 'name color');

    return NextResponse.json({ success: true, data: populatedTask }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
