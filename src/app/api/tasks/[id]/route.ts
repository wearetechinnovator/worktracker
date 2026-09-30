import { NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/dbConnect";
import Task from "@/models/Task";
import TaskWork from "@/models/TaskWork";
import Project from "@/models/Project";
import User from "@/models/User";
import { currentUser } from "@/lib/auth";
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
      `1970-01-01T${text.length === 5
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
   GET TASK
   ========================================================= */

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    await dbConnect();

    const user =
      await currentUser();

    const { id } =
      await params;

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

    if (
      !id ||
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid task ID is required",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       ACCESS
    ===================================================== */

    const accessFilter =
      Number(user.user_role) === 1
        ? {
          $or: [
            { created_by: user._id },
            { admin_id: user._id },
          ],
        }
        : {
          $or: [
            {
              created_by:
                user._id,
            },
            {
              assign_to:
                user._id,
            },
          ],
        };

    /* =====================================================
       FETCH
    ===================================================== */

    const task =
      await Task.findOne({
        _id: id,

        ...accessFilter,
      })
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
        .lean();

    if (
      !task ||
      task.status === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Task not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,

      data: task,
    });
  } catch (error: any) {
    console.error(
      "GET TASK ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Failed to fetch task",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   PATCH TASK
   ========================================================= */

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    await dbConnect();

    const user =
      await currentUser();

    const { id } =
      await params;

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

    if (
      !id ||
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid task ID is required",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       ACCESS FILTER
       - Admin: tasks created by this admin
       - Employee: tasks created by them OR assigned to them
       The employee-specific field restrictions are enforced below.
    ===================================================== */

    const isAdminUser =
      Number(user.user_role) === 1;

    const accessFilter = isAdminUser
      ? {
          $or: [
            { created_by: user._id },
            { admin_id: user._id },
          ],
        }
      : {
          created_by: user._id,
        };

    /* =====================================================
       GET OLD TASK
       IMPORTANT FOR ASSIGN / UNASSIGN
    ===================================================== */

    const existingTask =
      await Task.findOne({
        _id: id,

        ...accessFilter,
      }).lean();

    if (
      !existingTask ||
      existingTask.status === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Task not found",
        },
        {
          status: 404,
        }
      );
    }

    const body =
      await req.json();

    /* =====================================================
       REVIEW / REASSIGN
       Employee completion first goes to Review.
       Only the task owner/admin can approve or reassign.
    ===================================================== */

    const reviewAction = body.reviewAction;

    if (
      reviewAction === "approve" ||
      reviewAction === "reject"
    ) {
      if (Number(user.user_role) !== 1) {
        return NextResponse.json(
          {
            success: false,
            message: "Only an admin can review this task",
          },
          { status: 403 }
        );
      }

      if (existingTask.task_status !== "Review") {
        return NextResponse.json(
          {
            success: false,
            message: "This task is not waiting for review",
          },
          { status: 400 }
        );
      }

      const latestWork =
        await TaskWork.findOne({
          taskId: existingTask._id,
          status: "Completed",
        })
          .sort({
            updatedAt: -1,
            createdAt: -1,
          })
          .lean();

      if (!latestWork) {
        return NextResponse.json(
          {
            success: false,
            message: "No completed work session was found for review",
          },
          { status: 400 }
        );
      }

      const now = new Date();

      if (reviewAction === "approve") {
        const approvedStatus = "Completed";

        const approvedTask =
          await Task.findOneAndUpdate(
            {
              _id: id,
              created_by: user._id,
              status: { $ne: 0 },
              task_status: "Review",
            },
            {
              task_status: approvedStatus,
              completion_date: now,
              completion_time: now,
              modified_by: user._id,
              modified_on: now,
            },
            {
              new: true,
              runValidators: true,
            }
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

        if (!approvedTask) {
          return NextResponse.json(
            {
              success: false,
              message: "Task could not be approved",
            },
            { status: 404 }
          );
        }

        await createGlobalLog({
          actorId: String(user._id),
          action: "APPROVE",
          entityType: "Task",
          entityId: String(existingTask._id),
          targetUserId:
            Array.isArray(existingTask.assign_to) &&
            existingTask.assign_to.length > 0
              ? String(existingTask.assign_to[0])
              : null,
          description:
            `Approved task "${existingTask.title}" after employee review`,
          information: {
            task_id: existingTask.task_id,
            task_title: existingTask.title,
            approved_status: approvedStatus,
            work_id: String(latestWork._id),
            reviewed_at: now,
          },
        });

        return NextResponse.json({
          success: true,
          message:
            approvedStatus === "Completed"
              ? "Task approved and marked as completed"
              : "Task review approved",
          data: approvedTask,
        });
      }

      const reassignTo =
        typeof body.reassignTo === "string"
          ? body.reassignTo
          : "";

      if (
        !reassignTo ||
        !mongoose.Types.ObjectId.isValid(reassignTo)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Please select an employee to reassign the task",
          },
          { status: 400 }
        );
      }

      const reassignedEmployee =
        await User.findOne({
          _id: reassignTo,
          $or: [
            { user_role: 2 },
            { user_role: "2" },
            { user_role: { $exists: false } },
          ],
        }).select("_id full_name email");

      if (!reassignedEmployee) {
        return NextResponse.json(
          {
            success: false,
            message: "Selected employee not found",
          },
          { status: 400 }
        );
      }

      const oldAssignedIds =
        Array.isArray(existingTask.assign_to)
          ? existingTask.assign_to.map((employeeId: any) =>
              String(employeeId)
            )
          : [];

      const reassignedTask =
        await Task.findOneAndUpdate(
          {
            _id: id,
            status: { $ne: 0 },
          },
          {
            assign_to: [reassignedEmployee._id],
            task_status: "To Do",
            task_assign_date: now,
            task_delay_reason:
              typeof body.reviewReason === "string"
                ? body.reviewReason.trim() || null
                : existingTask.task_delay_reason || null,
            modified_by: user._id,
            modified_on: now,
          },
          {
            new: true,
            runValidators: true,
          }
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

      if (!reassignedTask) {
        return NextResponse.json(
          {
            success: false,
            message: "Task could not be reassigned",
          },
          { status: 404 }
        );
      }

      await createGlobalLog({
        actorId: String(user._id),
        action: "REJECT",
        entityType: "Task",
        entityId: String(existingTask._id),
        targetUserId: String(reassignedEmployee._id),
        description:
          `Rejected review for task "${existingTask.title}" and requested reassignment`,
        information: {
          task_id: existingTask.task_id,
          task_title: existingTask.title,
          previous_assignees: oldAssignedIds,
          new_assignee: String(reassignedEmployee._id),
          new_assignee_name: reassignedEmployee.full_name,
          reason:
            typeof body.reviewReason === "string"
              ? body.reviewReason.trim() || null
              : null,
          rejected_at: now,
          work_id: latestWork ? String(latestWork._id) : null,
        },
      });

      for (const employeeId of oldAssignedIds) {
        await createGlobalLog({
          actorId: String(user._id),
          action: "UNASSIGN",
          entityType: "Task",
          entityId: String(existingTask._id),
          targetUserId: employeeId,
          description:
            `Unassigned task "${existingTask.title}" during review reassignment`,
          information: {
            task_id: existingTask.task_id,
            task_title: existingTask.title,
            unassigned_user_id: employeeId,
            reassigned_to: String(reassignedEmployee._id),
            reassigned_at: now,
          },
        });
      }

      await createGlobalLog({
        actorId: String(user._id),
        action: "ASSIGN",
        entityType: "Task",
        entityId: String(existingTask._id),
        targetUserId: String(reassignedEmployee._id),
        description:
          `Reassigned task "${existingTask.title}" to ${reassignedEmployee.full_name}`,
        information: {
          task_id: existingTask.task_id,
          task_title: existingTask.title,
          assigned_user_id: String(reassignedEmployee._id),
          assigned_user_name: reassignedEmployee.full_name,
          assigned_at: now,
          previous_assignees: oldAssignedIds,
        },
      });

      return NextResponse.json({
        success: true,
        message:
          `Task rejected and reassigned to ${reassignedEmployee.full_name}`,
        data: reassignedTask,
      });
    }

    const updateData: Record<
      string,
      any
    > = {
      task_assign_date:
        body.task_assign_date,

      task_delay_reason:
        body.task_delay_reason,
    };

    /*
     * Reassigned employees are allowed to update only the
     * description and add files. They cannot change assignment,
     * project, title, priority, status, or remove existing files.
     */
    const isAssignedEmployee =
      !isAdminUser &&
      String(existingTask.created_by) !== String(user._id) &&
      Array.isArray(existingTask.assign_to) &&
      existingTask.assign_to.some(
        (employeeId: any) =>
          String(employeeId) === String(user._id)
      );

    if (isAssignedEmployee) {
      // Employees cannot change title, project, priority, status, or assignment
      if (
        body.title !== undefined &&
        String(body.title).trim() !== String(existingTask.title).trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Employees are not permitted to change the task title.",
          },
          { status: 403 }
        );
      }

      const reqProjId = body.project_id ?? body.projectId;
      if (
        reqProjId !== undefined &&
        String(reqProjId) !== String(existingTask.project_id)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Employees are not permitted to change the project.",
          },
          { status: 403 }
        );
      }

      if (
        body.priority !== undefined &&
        String(body.priority) !== String(existingTask.priority)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Employees are not permitted to change the task priority.",
          },
          { status: 403 }
        );
      }

      if (
        (body.task_status !== undefined &&
          String(body.task_status) !== String(existingTask.task_status)) ||
        (body.status !== undefined &&
          Number(body.status) !== Number(existingTask.status))
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Employees are not permitted to change task status directly. Work status is updated via work sessions.",
          },
          { status: 403 }
        );
      }

      const reqAssigned = body.assign_to ?? body.assignedTo;
      if (reqAssigned !== undefined) {
        const currentAssignedIds = Array.isArray(existingTask.assign_to)
          ? existingTask.assign_to.map((a: any) => String(a?._id || a))
          : [];
        const reqAssignedIds = Array.isArray(reqAssigned)
          ? reqAssigned.map((a: any) => String(a?._id || a))
          : [];
        const isChanged =
          currentAssignedIds.length !== reqAssignedIds.length ||
          currentAssignedIds.some((aid: string) => !reqAssignedIds.includes(aid));
        if (isChanged) {
          return NextResponse.json(
            {
              success: false,
              message: "Employees are not permitted to change task assignments.",
            },
            { status: 403 }
          );
        }
      }

      const employeeUpdate: Record<string, any> = {
        modified_by: user._id,
        modified_on: new Date(),
      };

      if (body.description !== undefined) {
        employeeUpdate.description =
          String(body.description);
      }

      if (body.files !== undefined) {
        if (!Array.isArray(body.files)) {
          return NextResponse.json(
            {
              success: false,
              message: "Files must be an array",
            },
            { status: 400 }
          );
        }

        const existingFiles = Array.isArray(existingTask.files)
          ? existingTask.files
          : [];

        const fileKey = (file: any) => {
          if (!file) return "";
          if (typeof file === "string") return file;
          if (file.url) return String(file.url);
          return [
            file.name || "",
            file.size || "",
            file.type || "",
          ].join("|");
        };

        const requestedFiles = body.files;
        const requestedKeys = new Set(
          requestedFiles.map(fileKey)
        );

        const removedExistingFile =
          existingFiles.some(
            (existingFile: any) =>
              !requestedKeys.has(
                fileKey(existingFile)
              )
          );

        if (removedExistingFile) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Existing task files cannot be deleted. You can only add new files.",
            },
            { status: 403 }
          );
        }

        employeeUpdate.files =
          requestedFiles;
      }

      if (body.urls !== undefined) {
        if (!Array.isArray(body.urls)) {
          return NextResponse.json(
            {
              success: false,
              message: "Links must be an array",
            },
            { status: 400 }
          );
        }

        const existingUrls = Array.isArray(existingTask.urls)
          ? existingTask.urls
          : (existingTask.url ? [existingTask.url] : []);
        const getUrlStr = (u: any) =>
          typeof u === "string" ? u.trim() : String(u?.url || u?.link || "").trim();
        const requestedUrlSet = new Set(body.urls.map(getUrlStr));
        const removedExistingUrl = existingUrls.some((u: any) => {
          const val = getUrlStr(u);
          return val && !requestedUrlSet.has(val);
        });

        if (removedExistingUrl) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Existing task links cannot be deleted. You can only add new links.",
            },
            { status: 403 }
          );
        }

        employeeUpdate.urls =
          body.urls;
      }

      const updatedEmployeeTask =
        await Task.findOneAndUpdate(
          {
            _id: id,
            status: { $ne: 0 },
            assign_to: user._id,
          },
          employeeUpdate,
          {
            new: true,
            runValidators: true,
          }
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

      if (!updatedEmployeeTask) {
        return NextResponse.json(
          {
            success: false,
            message: "Task not found or no longer assigned to you",
          },
          { status: 404 }
        );
      }

      await createGlobalLog({
        actorId: String(user._id),
        action: "UPDATE",
        entityType: "Task",
        entityId: String(updatedEmployeeTask._id),
        targetUserId: String(user._id),
        description:
          `Updated reassigned task "${updatedEmployeeTask.title}"`,
        information: {
          task_id: updatedEmployeeTask.task_id,
          description_updated:
            body.description !== undefined,
          files_count:
            Array.isArray(body.files)
              ? body.files.length
              : Array.isArray(existingTask.files)
                ? existingTask.files.length
                : 0,
          updated_at: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Task updated successfully",
        data: updatedEmployeeTask,
      });
    }

    /* =====================================================
       TITLE
    ===================================================== */

    if (
      body.title !==
      undefined
    ) {
      updateData.title =
        String(
          body.title
        ).trim();
    }

    /* =====================================================
       DESCRIPTION
    ===================================================== */

    if (
      body.description !==
      undefined
    ) {
      updateData.description =
        body.description;
    }

    /* =====================================================
       PROJECT
    ===================================================== */

    if (
      body.project_id !==
      undefined ||
      body.projectId !==
      undefined
    ) {
      const pId =
        body.project_id ??
        body.projectId;

      updateData.project_id =
        pId &&
          mongoose.Types.ObjectId.isValid(
            pId
          )
          ? pId
          : null;
    }

    /* =====================================================
       ASSIGNMENT
    ===================================================== */

    let assignmentChanged =
      false;

    let newAssignedIds: string[] =
      [];

    if (
      body.assign_to !==
      undefined ||
      body.assignedTo !==
      undefined
    ) {
      const rawAssigned =
        body.assign_to ??
        body.assignedTo;

      const requestedAssignedIds =
        Array.isArray(rawAssigned)
          ? rawAssigned
            .map(
              (item: any) =>
                typeof item ===
                  "object" &&
                  item !== null
                  ? item._id
                  : item
            )
            .filter(
              (memberId: any) =>
                typeof memberId ===
                "string" &&
                mongoose.Types.ObjectId.isValid(
                  memberId
                )
            )
          : [];

      const validAssignedTo =
        Number(user.user_role) === 1
          ? await User.find({
              _id: {
                $in: requestedAssignedIds,
              },
            }).distinct("_id")
          : [user._id];

      updateData.assign_to =
        validAssignedTo;

      newAssignedIds =
        validAssignedTo.map(
          (id: any) =>
            String(id)
        );

      assignmentChanged =
        true;
    }

    /* =====================================================
       PRIORITY
    ===================================================== */

    if (
      body.priority !==
      undefined
    ) {
      updateData.priority =
        body.priority;
    }

    /* =====================================================
       TASK STATUS
    ===================================================== */

    if (
      body.task_status !==
      undefined
    ) {
      updateData.task_status =
        body.task_status;
    } else if (
      body.status !==
      undefined &&
      typeof body.status ===
      "string"
    ) {
      updateData.task_status =
        body.status;
    }

    /* =====================================================
       FILES
    ===================================================== */

    if (
      body.files !==
      undefined
    ) {
      updateData.files =
        Array.isArray(
          body.files
        )
          ? body.files
          : [];
    }

    /* =====================================================
       URLS
    ===================================================== */

    if (
      body.urls !==
      undefined
    ) {
      updateData.urls =
        Array.isArray(
          body.urls
        )
          ? body.urls
          : [];
    }

    /* =====================================================
       COMPLETION DATE
    ===================================================== */

    if (
      body.completion_date !==
      undefined ||
      body.dueDate !==
      undefined
    ) {
      const d =
        body.completion_date ??
        body.dueDate;

      updateData.completion_date =
        d
          ? new Date(d)
          : null;
    }

    /* =====================================================
       COMPLETION TIME
    ===================================================== */

    if (
      body.completion_time !==
      undefined ||
      body.dueTime !==
      undefined
    ) {
      updateData.completion_time =
        toTimeDate(
          body.completion_time ??
          body.dueTime
        );
    }

    /* =====================================================
       RECORD STATUS
    ===================================================== */

    if (
      body.status !==
      undefined &&
      typeof body.status ===
      "number"
    ) {
      updateData.status =
        body.status;
    }

    /* =====================================================
       MODIFIED TRACKING
    ===================================================== */

    updateData.modified_by =
      user._id;

    updateData.modified_on =
      new Date();

    /* =====================================================
       UPDATE TASK
    ===================================================== */

    const updatedTask =
      await Task.findOneAndUpdate(
        {
          _id: id,

          ...accessFilter,
        },

        updateData,

        {
          new: true,

          runValidators: true,
        }
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
        .populate(
          "modified_by",
          "full_name name email"
        )
        .populate(
          "comments.user_id",
          "full_name name email profile_picture avatarColor"
        )
        .lean();

    if (!updatedTask) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Task not found",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       ASSIGN / UNASSIGN DETECTION
    ===================================================== */

    if (
      assignmentChanged
    ) {
      const oldAssignedIds =
        Array.isArray(existingTask.assign_to)
          ? existingTask.assign_to.map((id: any) =>
            String(id)
          )
          : [];

      const addedUserIds =
        newAssignedIds.filter(
          (id: string) =>
            !oldAssignedIds.includes(id)
        );

      const removedUserIds =
        oldAssignedIds.filter(
          (id: string) =>
            !newAssignedIds.includes(id)
        );

      /* ===================================================
         ASSIGN LOGS
      =================================================== */

      for (
        const employeeId of
        addedUserIds
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

        if (employee.email) {
          sendTaskAssignedMail({
            to: employee.email,
            assigneeName: employee.full_name || "Team Member",
            taskTitle: updatedTask.title,
            taskId: updatedTask.task_id,
            description: updatedTask.description,
            projectName:
              updatedTask.project_id && typeof updatedTask.project_id === "object"
                ? updatedTask.project_id.name
                : undefined,
            priority: updatedTask.priority,
            status: updatedTask.task_status,
            dueDate: updatedTask.completion_date,
            dueTime: updatedTask.completion_time,
            assignedByName: user.full_name || user.name || "Admin",
          }).catch((err) => {
            console.error("Failed to send task assigned mail on update:", err);
          });
        }

        await createGlobalLog({
          actorId:
            String(user._id),

          action:
            "ASSIGN",

          entityType:
            "Task",

          entityId:
            String(
              updatedTask._id
            ),

          targetUserId:
            String(
              employee._id
            ),

          description:
            `Assigned task "${updatedTask.title}" to ${employee.full_name}`,

          information: {
            task_id:
              updatedTask.task_id,

            task_title:
              updatedTask.title,

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

      /* ===================================================
         UNASSIGN LOGS
      =================================================== */

      for (
        const employeeId of
        removedUserIds
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
            "UNASSIGN",

          entityType:
            "Task",

          entityId:
            String(
              updatedTask._id
            ),

          targetUserId:
            String(
              employee._id
            ),

          description:
            `Unassigned task "${updatedTask.title}" from ${employee.full_name}`,

          information: {
            task_id:
              updatedTask.task_id,

            task_title:
              updatedTask.title,

            unassigned_from:
              String(
                employee._id
              ),

            unassigned_user_name:
              employee.full_name,

            unassigned_at:
              new Date(),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,

      message:
        "Task updated successfully",

      data:
        updatedTask,
    });
  } catch (error: any) {
    console.error(
      "UPDATE TASK ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Failed to update task",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   DELETE TASK
   SOFT DELETE
   ========================================================= */

export async function DELETE(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    await dbConnect();

    const user =
      await currentUser();

    const { id } =
      await params;

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

    if (
      !id ||
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid task ID is required",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       ACCESS
    ===================================================== */

    // Admins keep their existing access. Employees can delete only tasks
    // that they originally created; being assigned is not enough.
    const accessFilter =
      Number(user.user_role) === 1
        ? {
            $or: [
              { created_by: user._id },
              { admin_id: user._id },
            ],
          }
        : {
            created_by: user._id,
          };

    /* =====================================================
       GET ORIGINAL TASK
       BEFORE SOFT DELETE
    ===================================================== */

    const existingTask =
      await Task.findOne({
        _id: id,

        ...accessFilter,
      }).lean();

    if (
      !existingTask ||
      existingTask.status === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Task not found",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       SOFT DELETE
    ===================================================== */

    const deletedTask =
      await Task.findOneAndUpdate(
        {
          _id: id,

          ...accessFilter,
        },

        {
          status: 0,

          modified_by:
            user._id,

          modified_on:
            new Date(),
        },

        {
          new: true,
        }
      );

    if (!deletedTask) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Task not found",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       GLOBAL LOG - DELETE
    ===================================================== */

    await createGlobalLog({
      actorId:
        String(user._id),

      action:
        "DELETE",

      entityType:
        "Task",

      entityId:
        String(
          existingTask._id
        ),

      description:
        `Deleted task "${existingTask.title}"`,

      information: {
        task_id:
          existingTask.task_id,

        title:
          existingTask.title,

        project_id:
          existingTask.project_id
            ? String(
              existingTask.project_id
            )
            : null,

        assigned_users:
          Array.isArray(
            existingTask.assign_to
          )
            ? existingTask.assign_to.map(
              (id: any) =>
                String(id)
            )
            : [],

        priority:
          existingTask.priority,

        task_status:
          existingTask.task_status,

        deleted_at:
          new Date(),
      },
    });

    return NextResponse.json({
      success: true,

      message:
        "Task deleted successfully",
    });
  } catch (error: any) {
    console.error(
      "DELETE TASK ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Failed to delete task",
      },
      {
        status: 500,
      }
    );
  }
}