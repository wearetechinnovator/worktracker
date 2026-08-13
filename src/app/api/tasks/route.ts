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

    // Filter by assigned employee or creator employee
    if (employeeId) {
      if (mongoose.Types.ObjectId.isValid(employeeId)) {
        const empObjId = new mongoose.Types.ObjectId(employeeId);
        query.$or = [
          { assignedTo: { $in: [empObjId, employeeId] } },
          { createdBy: { $in: [empObjId, employeeId] } },
        ];
      } else {
        query.$or = [
          { assignedTo: employeeId },
          { createdBy: employeeId },
        ];
      }
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
      .populate('assignedTo', 'name email avatarColor role department')
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
      department: reqDepartment,
      assignedTo: reqAssignedTo,
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

    // Find creator by _id or email fallback
    let creator = null;
    if (mongoose.Types.ObjectId.isValid(createdBy)) {
      creator = await Employee.findById(createdBy);
    }
    if (!creator) {
      creator = await Employee.findOne({
        $or: [
          { email: createdBy.toString().toLowerCase().trim() },
          ...(mongoose.Types.ObjectId.isValid(createdBy) ? [{ _id: createdBy }] : [])
        ]
      });
    }

    if (!creator) {
      return NextResponse.json(
        { success: false, error: 'Creator not found' },
        { status: 404 }
      );
    }

    const creatorIdStr = creator._id.toString();
    const isAdmin = creator.userType === 'admin';

    // Auto-default department from creator if neither project nor department is specified
    let department = reqDepartment;
    if (!projectId && !department && creator.department) {
      department = creator.department;
    }

    // Must have either projectId or department
    if (!projectId && !department) {
      return NextResponse.json(
        { success: false, error: 'Either project or department must be specified' },
        { status: 400 }
      );
    }

    // Assigned employees array setup
    let finalAssignedTo: string[] = Array.isArray(reqAssignedTo) ? reqAssignedTo : [];
    
    // If employee is creating and assignedTo is empty, default assignedTo to themselves
    if (!isAdmin && finalAssignedTo.length === 0) {
      finalAssignedTo = [creatorIdStr];
    }

    // Validate employee creation restriction: non-admins can only assign to themselves
    if (!isAdmin) {
      const isSelfOnly = finalAssignedTo.every(id => id.toString() === creatorIdStr);
      if (!isSelfOnly) {
        return NextResponse.json(
          { success: false, error: 'Employees can only create tasks assigned to themselves' },
          { status: 403 }
        );
      }
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
    if (finalAssignedTo.length > 0) {
      const validEmpObjectIds = finalAssignedTo
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));

      const employees = await Employee.find({
        $or: [
          { _id: { $in: validEmpObjectIds } },
          { _id: { $in: finalAssignedTo } }
        ]
      });

      if (employees.length === 0) {
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
      assignedTo: finalAssignedTo,
      createdBy: creator._id,
      priority: priority || 'Medium',
      status: status || 'To Do',
      dueDate,
      tags: tags || [],
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatarColor role department')
      .populate('createdBy', 'name email')
      .populate('projectId', 'name color');

    return NextResponse.json({ success: true, data: populatedTask }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
