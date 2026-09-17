import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Task from '@/models/Task';
import User from '@/models/User';
import { currentUser } from '@/lib/auth';

// GET /api/tasks - Get all tasks with populated project and user references
export async function GET(req: Request) {
  try {
    await dbConnect();
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('project_id') || searchParams.get('projectId');
    const assignTo = searchParams.get('assign_to') || searchParams.get('assignedTo');
    const taskStatus = searchParams.get('task_status') || searchParams.get('status');
    const priority = searchParams.get('priority');

    const filter: Record<string, any> = {
      // By default filter active tasks (status != 0)
      status: { $ne: 0 }
    };

    filter[Number(user.user_role) === 1 ? 'created_by' : '$or'] =
      Number(user.user_role) === 1
        ? user._id
        : [{ created_by: user._id }, { assign_to: user._id }];

    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      filter.project_id = projectId;
    }
    if (assignTo && mongoose.Types.ObjectId.isValid(assignTo)) {
      filter.assign_to = assignTo;
    }
    if (taskStatus && taskStatus !== 'all') {
      filter.task_status = taskStatus;
    }
    if (priority) {
      filter.priority = priority;
    }

    const tasks = await Task.find(filter)
      .populate('project_id', 'name color')
      .populate('assign_to', 'full_name name email profile_picture avatarColor')
      .populate('created_by', 'full_name name email avatarColor')
      .populate('modified_by', 'full_name name email')
      .populate('comments.user_id', 'full_name name email profile_picture avatarColor')
      .sort({ created_on: -1, createdAt: -1 })
      .lean();

    // Map tasks to ensure compatibility with both new model and existing UI components
    const formattedTasks = tasks.map((task: any) => {
      const assignedArr = Array.isArray(task.assign_to)
        ? task.assign_to.map((u: any) =>
            typeof u === 'object' && u !== null
              ? {
                  _id: u._id,
                  name: u.full_name || u.name || 'User',
                  email: u.email || '',
                  avatarColor: u.avatarColor || '#4f46e5'
                }
              : u
          )
        : [];

      const createdObj =
        typeof task.created_by === 'object' && task.created_by !== null
          ? {
              _id: task.created_by._id,
              name: task.created_by.full_name || task.created_by.name || 'Admin',
              email: task.created_by.email || ''
            }
          : task.created_by;

      const projectObj =
        typeof task.project_id === 'object' && task.project_id !== null
          ? {
              _id: task.project_id._id,
              name: task.project_id.name,
              color: task.project_id.color || '#3b82f6'
            }
          : undefined;

      const formattedComments = Array.isArray(task.comments)
        ? task.comments.map((c: any) => ({
            _id: c._id,
            comment: c.comment,
            user_id: c.user_id,
            datetime: c.datetime,
            // legacy mapping
            author:
              typeof c.user_id === 'object' && c.user_id !== null
                ? {
                    _id: c.user_id._id,
                    name: c.user_id.full_name || c.user_id.name || 'User',
                    email: c.user_id.email
                  }
                : { _id: c.user_id, name: 'User' },
            content: c.comment,
            createdAt: c.datetime
          }))
        : [];

      return {
        ...task,
        // New model fields
        project_id: task.project_id,
        assign_to: task.assign_to,
        created_by: task.created_by,
        task_status: task.task_status || 'To Do',
        completion_date: task.completion_date,
        completion_time: task.completion_time,
        created_on: task.created_on || task.createdAt,
        modified_by: task.modified_by,
        modified_on: task.modified_on,
        status: task.status ?? 1,
        comments: typeof task.comments === 'string' ? task.comments : '',

        // Compatibility getters
        projectId: projectObj,
        Project: projectObj?.name,
        assignedTo: assignedArr,
        createdBy: createdObj,
        dueDate: task.completion_date ? new Date(task.completion_date).toISOString().split('T')[0] : undefined,
        dueTime: task.completion_time || undefined,
        commentsList: formattedComments,
        createdAt: task.created_on || task.createdAt
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedTasks
    });
  } catch (error: any) {
    console.error('GET TASKS ERROR:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to fetch tasks'
      },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(req: Request) {
  try {
    await dbConnect();
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      project_id,
      projectId,
      assign_to,
      assignedTo,
      created_by,
      createdBy,
      priority,
      task_status,
      status: reqStatus,
      files,
      urls,
      url,
      comments,
      completion_date,
      dueDate,
      completion_time,
      dueTime
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: 'Task title is required'
        },
        { status: 400 }
      );
    }

    const finalProjectId = project_id || projectId;
    const rawAssigned = assign_to || assignedTo || [];
    const requestedAssignedIds = Array.isArray(rawAssigned)
      ? rawAssigned
          .map((id: any) => (typeof id === 'object' && id !== null ? id._id : id))
          .filter((id: any) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id))
      : [];
    const validAssignedTo = Number(user.user_role) === 1
      ? await User.find({
          _id: { $in: requestedAssignedIds },
          user_role: 2,
          created_by: user._id,
        }).distinct('_id')
      : [user._id];

    const finalCreatedBy = user._id;

    const formattedUrls = Array.isArray(urls)
      ? urls
      : url ? [url] : [];

    const formattedFiles = Array.isArray(files) ? files : [];

    const taskData: Record<string, any> = {
      title: title.trim(),
      description: description || '',
      project_id: finalProjectId && mongoose.Types.ObjectId.isValid(finalProjectId) ? finalProjectId : null,
      assign_to: validAssignedTo,
      created_by: finalCreatedBy,
      priority: priority || 'Medium',
      task_status: task_status || (typeof reqStatus === 'string' ? reqStatus : 'To Do'),
      files: formattedFiles,
      urls: formattedUrls,
      comments: Array.isArray(comments) ? comments : [],
      completion_date: completion_date || dueDate ? new Date(completion_date || dueDate) : null,
      completion_time: completion_time || dueTime || null,
      created_on: new Date(),
      status: 1
    };

    const task = await Task.create(taskData);

    const populatedTask = await Task.findById(task._id)
      .populate('project_id', 'name color')
      .populate('assign_to', 'full_name name email profile_picture avatarColor')
      .populate('created_by', 'full_name name email avatarColor')
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: 'Task created successfully',
        data: populatedTask
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('CREATE TASK ERROR:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to create task'
      },
      { status: 500 }
    );
  }
}
