import { NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/dbConnect";
import Task from "@/models/Task";
import Project from "@/models/Project";
import User from "@/models/User";
import Settings from "@/models/Settings";
import { currentUser } from "@/lib/auth";
import { createInitialTaskLogs } from "@/lib/taskLog";
import { createGlobalLog } from "@/lib/globalLog";
import { sendTaskAssignedMail } from "@/lib/mailer";

/* =========================================================
   TIME HELPER
   ========================================================= */

function toTimeDate(value: unknown) {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  const text = String(value);

  if (/^\d{2}:\d{2}(:\d{2})?$/.test(text)) {
    return new Date(
      `1970-01-01T${
        text.length === 5
          ? `${text}:00`
          : text
      }`
    );
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

/* =========================================================
   GET /api/tasks
   GET ALL TASKS
   ========================================================= */

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user =
      await currentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Authentication required",
        },
        {
          status: 401,
        }
      );
    }

    const { searchParams } =
      new URL(req.url);

    const projectId =
      searchParams.get("project_id") ||
      searchParams.get("projectId");

    const assignTo =
      searchParams.get("assign_to") ||
      searchParams.get("assignedTo");

    const taskStatus =
      searchParams.get("task_status") ||
      searchParams.get("status");

    const priority =
      searchParams.get("priority");

    /* =====================================================
       FILTER
    ===================================================== */

    const filter: Record<
      string,
      any
    > = {
      status: {
        $ne: 0,
      },
    };

    const userObjectId = mongoose.Types.ObjectId.isValid(user._id)
      ? new mongoose.Types.ObjectId(String(user._id))
      : user._id;

    if (
      Number(user.user_role) === 1
    ) {
      filter.$or = [
        { admin_id: userObjectId },
        { created_by: userObjectId },
      ];
    } else {
      filter.$or = [
        {
          created_by: userObjectId,
        },
        {
          assign_to: userObjectId,
        },
        {
          assign_to: String(user._id),
        },
      ];
    }

    /* =====================================================
       PROJECT FILTER
    ===================================================== */

    if (
      projectId &&
      mongoose.Types.ObjectId.isValid(
        projectId
      )
    ) {
      filter.project_id =
        projectId;
    }

    /* =====================================================
       ASSIGN FILTER
    ===================================================== */

    if (
      assignTo &&
      mongoose.Types.ObjectId.isValid(
        assignTo
      )
    ) {
      filter.assign_to =
        assignTo;
    }

    /* =====================================================
       STATUS FILTER
    ===================================================== */

    if (
      taskStatus &&
      taskStatus !== "all"
    ) {
      if (
        taskStatus ===
          "Partially Done" ||
        taskStatus ===
          "Partially Completed"
      ) {
        filter.task_status = {
          $in: [
            "Partially Done",
            "Partially Completed",
          ],
        };
      } else {
        filter.task_status =
          taskStatus;
      }
    }

    /* =====================================================
       PRIORITY FILTER
    ===================================================== */

    if (priority) {
      filter.priority =
        priority;
    }

    /* =====================================================
       FETCH TASKS
    ===================================================== */

    const tasks =
      await Task.find(filter)
        .populate(
          "project_id",
          "name color"
        )
        .populate(
          "assign_to",
          "full_name name email profile_picture avatarColor"
        )
        .populate(
          "created_by",
          "full_name name email avatarColor"
        )
        .populate(
          "modified_by",
          "full_name name email"
        )
        .populate(
          "comments.user_id",
          "full_name name email profile_picture avatarColor"
        )
        .sort({
          created_on: -1,
          createdAt: -1,
        })
        .lean();

    /* =====================================================
       FORMAT TASKS
    ===================================================== */

    const formattedTasks =
      tasks.map(
        (task: any) => {
          const assignedArr =
            Array.isArray(
              task.assign_to
            )
              ? task.assign_to.map(
                  (u: any) =>
                    typeof u ===
                      "object" &&
                    u !== null
                      ? {
                          _id:
                            u._id,

                          name:
                            u.full_name ||
                            u.name ||
                            "User",

                          email:
                            u.email ||
                            "",

                          avatarColor:
                            u.avatarColor ||
                            "#4f46e5",
                        }
                      : u
                )
              : [];

          const createdObj =
            typeof task.created_by ===
              "object" &&
            task.created_by !== null
              ? {
                  _id:
                    task.created_by
                      ._id,

                  name:
                    task.created_by
                      .full_name ||
                    task.created_by
                      .name ||
                    "Admin",

                  email:
                    task.created_by
                      .email ||
                    "",
                }
              : task.created_by;

          const projectObj =
            typeof task.project_id ===
              "object" &&
            task.project_id !== null
              ? {
                  _id:
                    task.project_id
                      ._id,

                  name:
                    task.project_id
                      .name,

                  color:
                    task.project_id
                      .color ||
                    "#3b82f6",
                }
              : undefined;

          const formattedComments =
            Array.isArray(
              task.comments
            )
              ? task.comments.map(
                  (c: any) => ({
                    _id: c._id,

                    comment:
                      c.comment,

                    user_id:
                      c.user_id,

                    datetime:
                      c.datetime,

                    author:
                      typeof c.user_id ===
                        "object" &&
                      c.user_id !== null
                        ? {
                            _id:
                              c.user_id
                                ._id,

                            name:
                              c.user_id
                                .full_name ||
                              c.user_id
                                .name ||
                              "User",

                            email:
                              c.user_id
                                .email,
                          }
                        : {
                            _id:
                              c.user_id,

                            name:
                              "User",
                          },

                    content:
                      c.comment,

                    createdAt:
                      c.datetime,
                  })
                )
              : [];

          return {
            ...task,

            project_id:
              task.project_id,

            assign_to:
              task.assign_to,

            created_by:
              task.created_by,

            task_status:
              task.task_status ===
              "Partially Completed"
                ? "Partially Done"
                : task.task_status ||
                  "To Do",

            completion_date:
              task.completion_date,

            completion_time:
              task.completion_time,

            created_on:
              task.created_on ||
              task.createdAt,

            modified_by:
              task.modified_by,

            modified_on:
              task.modified_on,

            status:
              task.task_status ===
              "Partially Completed"
                ? "Partially Done"
                : task.task_status ||
                  "To Do",

            record_status:
              task.status ?? 1,

            comments:
              typeof task.comments ===
              "string"
                ? task.comments
                : "",

            projectId:
              projectObj,

            Project:
              projectObj?.name,

            assignedTo:
              assignedArr,

            createdBy:
              createdObj,

            dueDate:
              task.completion_date
                ? new Date(
                    task.completion_date
                  )
                    .toISOString()
                    .split("T")[0]
                : undefined,

            dueTime:
              task.completion_time ||
              undefined,

            commentsList:
              formattedComments,

            createdAt:
              task.created_on ||
              task.createdAt,
          };
        }
      );

    return NextResponse.json({
      success: true,

      data: formattedTasks,
    });
  } catch (error: any) {
    console.error(
      "GET TASKS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Failed to fetch tasks",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST /api/tasks
   CREATE TASK
   ========================================================= */

export async function POST(
  req: Request
) {
  try {
    await dbConnect();

    const user =
      await currentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Authentication required",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await req.json();

    const {
      title,
      description,

      project_id,
      projectId,

      assign_to,
      assignedTo,

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
      dueTime,

      task_assign_date,

      task_delay_reason,
    } = body;

    /* =====================================================
       TITLE
    ===================================================== */

    if (
      !title ||
      !title.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Task title is required",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       PROJECT
    ===================================================== */

    const finalProjectId =
      project_id ||
      projectId;

    const isEmployee = Number(user.user_role) !== 1;

    if (isEmployee) {
      if (!finalProjectId || !mongoose.Types.ObjectId.isValid(finalProjectId)) {
        return NextResponse.json(
          {
            success: false,
            message: "Project is required. You must select an assigned project to create a task.",
          },
          {
            status: 400,
          }
        );
      }

      // Verify that the employee is assigned to this project
      const userObjectId = mongoose.Types.ObjectId.isValid(user._id)
        ? new mongoose.Types.ObjectId(String(user._id))
        : null;

      const assignedProject = await Project.findOne({
        _id: finalProjectId,
        $or: [
          ...(userObjectId ? [{ project_users: userObjectId }] : []),
          { project_users: String(user._id) },
        ],
      });

      if (!assignedProject) {
        return NextResponse.json(
          {
            success: false,
            message: "You are not assigned to this project and cannot create tasks in it.",
          },
          {
            status: 403,
          }
        );
      }
    }

    /* =====================================================
       ASSIGNMENT
    ===================================================== */

    const rawAssigned =
      assign_to ||
      assignedTo ||
      [];

    const requestedAssignedIds =
      Array.isArray(rawAssigned)
        ? rawAssigned
            .map(
              (id: any) =>
                typeof id ===
                  "object" &&
                id !== null
                  ? id._id
                  : id
            )
            .filter(
              (id: any) =>
                typeof id ===
                  "string" &&
                mongoose.Types.ObjectId.isValid(
                  id
                )
            )
        : [];

    const validAssignedTo =
      Number(user.user_role) === 1
        ? await User.find({
            _id: {
              $in:
                requestedAssignedIds,
            },
          }).distinct("_id")
        : [user._id];

    /* =====================================================
       CREATED BY
    ===================================================== */

    const finalCreatedBy =
      user._id;

    /* =====================================================
       URLS
    ===================================================== */

    const formattedUrls =
      Array.isArray(urls)
        ? urls
        : url
          ? [url]
          : [];

    /* =====================================================
       FILES
    ===================================================== */

    const formattedFiles =
      Array.isArray(files)
        ? files
        : [];

    /* =====================================================
       TASK NUMBER & UNIQUE TASK ID GENERATION (PER ACCOUNT)
    ===================================================== */

    const adminId = Number(user.user_role) === 1
      ? user._id
      : (user.created_by || user.settings_id || user._id);

    const settingsOwnerId = adminId;

    let taskSettings = await Settings.findOne({
      owner_user_id: settingsOwnerId,
    });

    if (!taskSettings && user.settings_id) {
      taskSettings = await Settings.findById(user.settings_id);
    }

    if (!taskSettings) {
      taskSettings = await Settings.findOne({
        owner_user_id: user._id,
      });
    }

    const taskPrefix = String(
      taskSettings?.taskIdPrefix || "QT"
    )
      .trim()
      .toUpperCase() || "QT";

    const escapedPrefix = taskPrefix.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
    const taskIdRegex = new RegExp(`^${escapedPrefix}-(\\d+)$`, "i");

    // Scan all existing tasks with this prefix FOR THIS ACCOUNT ONLY
    const existingPrefixTasks = await Task.find({
      $or: [{ admin_id: adminId }, { created_by: adminId }],
      task_id: { $regex: taskIdRegex },
    })
      .select("task_id")
      .lean();

    let highestExistingNumber = 0;
    for (const existingTask of existingPrefixTasks) {
      const match = String(existingTask.task_id || "").match(taskIdRegex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (Number.isFinite(num) && num > highestExistingNumber) {
          highestExistingNumber = num;
        }
      }
    }

    // Determine the next number for this account (starts from 1 if no tasks exist in this account)
    const configuredNext = Number(taskSettings?.nextTaskNumber || 1);
    const targetNextNumber = Math.max(
      highestExistingNumber + 1,
      Number.isFinite(configuredNext) && configuredNext > 0 ? configuredNext : 1
    );

    // Atomically ensure settings is synchronized to at least targetNextNumber
    if (taskSettings) {
      await Settings.updateOne(
        { _id: taskSettings._id, nextTaskNumber: { $lt: targetNextNumber } },
        { $set: { nextTaskNumber: targetNextNumber } }
      );
    }

    // Atomically reserve the next number for this account
    const reservedSettings = await Settings.findOneAndUpdate(
      {
        owner_user_id: settingsOwnerId,
      },
      {
        $inc: {
          nextTaskNumber: 1,
        },
        $setOnInsert: {
          taskIdPrefix: taskPrefix,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    let taskNumber = Math.max(
      highestExistingNumber + 1,
      (Number(reservedSettings.nextTaskNumber) || (targetNextNumber + 1)) - 1
    );

    // Safety collision check for this account: Ensure this task_id does not already exist in this account
    while (
      await Task.exists({
        $or: [{ admin_id: adminId }, { created_by: adminId }],
        task_id: `${taskPrefix}-${taskNumber}`,
      })
    ) {
      taskNumber++;
      if (taskSettings) {
        await Settings.updateOne(
          { _id: taskSettings._id },
          { $set: { nextTaskNumber: taskNumber + 1 } }
        );
      }
    }

    const taskId = `${taskPrefix}-${taskNumber}`;

    /* =====================================================
       TASK DATA
    ===================================================== */

    const taskData: Record<
      string,
      any
    > = {
      task_id:
        taskId,

      admin_id:
        adminId,

      title:
        title.trim(),

      description:
        description || "",

      project_id:
        finalProjectId &&
        mongoose.Types.ObjectId.isValid(
          finalProjectId
        )
          ? finalProjectId
          : null,

      assign_to:
        validAssignedTo,

      created_by:
        finalCreatedBy,

      priority:
        priority || "Medium",

      task_status:
        task_status ||
        (typeof reqStatus ===
        "string"
          ? reqStatus
          : "To Do"),

      files:
        formattedFiles,

      urls:
        formattedUrls,

      comments:
        Array.isArray(comments)
          ? comments
          : [],

      completion_date:
        completion_date ||
        dueDate
          ? new Date(
              completion_date ||
                dueDate
            )
          : null,

      completion_time:
        toTimeDate(
          completion_time ||
            dueTime
        ),

      created_on:
        new Date(),

      status: 1,

      task_assign_date,

      task_delay_reason,
    };

    /* =====================================================
       CREATE TASK
    ===================================================== */

    const task =
      await Task.create(
        taskData
      );


    /* =====================================================
       EXISTING TASK LOG
       ===================================================== */

    await createInitialTaskLogs(
      task
    );

    /* =====================================================
       GLOBAL LOG - CREATE TASK
    ===================================================== */

    await createGlobalLog({
      actorId:
        String(user._id),

      action:
        "CREATE",

      entityType:
        "Task",

      entityId:
        String(task._id),

      description:
        `Created task "${task.title}"`,

      information: {
        task_id:
          task.task_id,

        title:
          task.title,

        description:
          task.description,

        project_id:
          task.project_id
            ? String(
                task.project_id
              )
            : null,

        priority:
          task.priority,

        task_status:
          task.task_status,

        created_by:
          String(
            task.created_by
          ),

        created_at:
          task.created_on,

        assigned_users:
          validAssignedTo.map(
            (id: any) =>
              String(id)
          ),
      },
    });

    /* =====================================================
       GLOBAL LOG - INITIAL ASSIGNMENTS
    ===================================================== */

    for (
      const employeeId of
        validAssignedTo
    ) {
      const employee =
        await User.findById(
          employeeId
        )
          .select(
            "_id full_name email"
          )
          .lean();

      if (!employee) {
        continue;
      }

      await createGlobalLog({
        actorId:
          String(user._id),

        action:
          "ASSIGN",

        entityType:
          "Task",

        entityId:
          String(task._id),

        targetUserId:
          String(
            employee._id
          ),

        description:
          `Assigned task "${task.title}" to ${employee.full_name}`,

        information: {
          task_id:
            task.task_id,

          task_title:
            task.title,

          assigned_to:
            String(
              employee._id
            ),

          assigned_user_name:
            employee.full_name,

          assigned_at:
            new Date(),
        },
      });
    }

    /* =====================================================
       POPULATE
    ===================================================== */

    const populatedTask =
      await Task.findById(
        task._id
      )
        .populate(
          "project_id",
          "name color"
        )
        .populate(
          "assign_to",
          "full_name name email profile_picture avatarColor"
        )
        .populate(
          "created_by",
          "full_name name email avatarColor"
        )
        .lean();

    if (populatedTask && Array.isArray(populatedTask.assign_to)) {
      for (const assignee of populatedTask.assign_to) {
        if (assignee && typeof assignee === "object" && assignee.email) {
          sendTaskAssignedMail({
            to: assignee.email,
            assigneeName: assignee.full_name || assignee.name || "Team Member",
            taskTitle: populatedTask.title,
            taskId: populatedTask.task_id,
            description: populatedTask.description,
            projectName:
              populatedTask.project_id && typeof populatedTask.project_id === "object"
                ? populatedTask.project_id.name
                : undefined,
            priority: populatedTask.priority,
            status: populatedTask.task_status,
            dueDate: populatedTask.completion_date,
            dueTime: populatedTask.completion_time,
            assignedByName: user.full_name || user.name || "Admin",
          }).catch((err) => {
            console.error("Failed to send task assignment email:", err);
          });
        }
      }
    }

    return NextResponse.json(
      {
        success: true,

        message:
          "Task created successfully",

        data:
          populatedTask,
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error(
      "CREATE TASK ERROR:",
      error
    );

    if (
      error?.code === 11000 &&
      (
        error?.keyPattern?.task_id ||
        error?.keyValue?.task_id ||
        String(error?.message).includes("task_id")
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Another task was created at the same time. Please create the task again.",
          code: "TASK_ID_COLLISION",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Failed to create task",
      },
      {
        status: 500,
      }
    );
  }
}