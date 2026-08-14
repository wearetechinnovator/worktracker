import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Task from '@/models/Task';
import Employee from '@/models/Employee';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';
import { getPagination, paginatedResponse } from '@/lib/api';
import { isErrorResponse, requireUser } from '@/lib/auth';

// GET - Fetch all tasks or filtered tasks
export async function GET(request: Request) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;
    const { searchParams } = new URL(request.url);
    const employeeId = user.userType === 'admin' ? searchParams.get('employeeId') : user.id;
    const projectId = searchParams.get('projectId');
    const department = searchParams.get('department');
    const status = searchParams.get('status');

    const query: Record<string, unknown> = {};
    const { page, limit, skip } = getPagination(searchParams);

    // Filter by assigned employee or creator employee
    if (employeeId) {
      if (mongoose.Types.ObjectId.isValid(employeeId)) {
        const empObjId = new mongoose.Types.ObjectId(employeeId);
        query.$or = [
          { assignedTo: { $in: [empObjId, employeeId] } },
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

    const [tasks, total] = await Promise.all([
      Task.find(query)
      .populate('assignedTo', 'name email avatarColor role department')
      .populate('createdBy', 'name email')
      .populate('projectId', 'name color')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
      Task.countDocuments(query),
    ]);

    return paginatedResponse(tasks, page, limit, total);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create a new task
export async function POST(request: Request) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;
    const body = await request.json();
    const {
      title,
      description,
      projectId,
      department: reqDepartment,
      assignedTo: reqAssignedTo,
      createdBy,
      userId,
      userEmail,
      email,
      priority,
      status,
      dueDate,
      tags,
    } = body;

    // Validation
    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Task title is required' },
        { status: 400 }
      );
    }

    // Ultra-robust creator lookup using createdBy, userId, userEmail, or email
    const creatorKey = user.userType === 'admin' ? (createdBy || userId || userEmail || email) : user.id;
    let creator = null;

    if (creatorKey) {
      if (mongoose.Types.ObjectId.isValid(creatorKey)) {
        creator = await Employee.findById(creatorKey);
      }
      if (!creator) {
        creator = await Employee.findOne({
          $or: [
            { email: creatorKey.toString().toLowerCase().trim() },
            ...(mongoose.Types.ObjectId.isValid(creatorKey) ? [{ _id: creatorKey }] : [])
          ]
        });
      }
    }

    if (!creator) {
      return NextResponse.json(
        { success: false, error: 'Creator not found. Please log out and log in again.' },
        { status: 404 }
      );
    }

    const creatorIdStr = creator._id.toString();
    const isAdmin = user.userType === 'admin';

    // Auto-default department from creator or fallback to 'General'
    let department = reqDepartment;
    if (!projectId && !department) {
      department = creator.department || 'General';
    }

    // Assigned employees array setup
    let finalAssignedTo: string[] = isAdmin && Array.isArray(reqAssignedTo) ? reqAssignedTo.filter(Boolean) : [];
    
    // If employee is creating and assignedTo is empty, default assignedTo to themselves
    if (!isAdmin && finalAssignedTo.length === 0) {
      finalAssignedTo = [creatorIdStr];
    }

    // Find actual matching Employee documents for assignedTo
    let assignedEmployeeDocs: any[] = [];
    if (finalAssignedTo.length > 0) {
      const validEmpObjectIds = finalAssignedTo
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));

      assignedEmployeeDocs = await Employee.find({
        $or: [
          { _id: { $in: validEmpObjectIds } },
          { _id: { $in: finalAssignedTo } },
          { email: { $in: finalAssignedTo.map(e => e.toString().toLowerCase()) } }
        ]
      });
    }

    // Default assignedTo to creator if no assigned employees resolved
    if (assignedEmployeeDocs.length === 0) {
      assignedEmployeeDocs = [creator];
    }

    const task = await Task.create({
      title,
      description,
      projectId: projectId || undefined,
      department: department || undefined,
      assignedTo: assignedEmployeeDocs.map(e => e._id),
      createdBy: creator._id,
      priority: priority || 'Medium',
      status: status || 'To Do',
      dueDate,
      tags: tags || [],
    });

    // Send in-app notification to assigned employees
    try {
      for (const empDoc of assignedEmployeeDocs) {
        if (empDoc._id.toString() !== creatorIdStr) {
          await Notification.create({
            userId: empDoc._id,
            title: '📋 New Task Assigned',
            message: `Admin assigned you a new task: "${title}"`,
            type: 'task',
            link: '/tasks',
            read: false,
          });
        }
      }
    } catch (notifErr) {
      console.error('Failed to create assignment notification:', notifErr);
    }

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatarColor role department')
      .populate('createdBy', 'name email')
      .populate('projectId', 'name color');

    return NextResponse.json({ success: true, data: populatedTask }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
