import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { currentUser } from "@/lib/auth";
import Task from "@/models/Task";
import TaskWork from "@/models/TaskWork";
import TaskLog from "@/models/TaskLog";
import User from "@/models/User";
import { syncTaskStatus } from "@/lib/taskStatusHelper";

type Action = "start" | "pause" | "resume" | "complete";

type WorkFile = {
  name: string;
  url: string;
  size?: number;
  type?: string;
};

function normalizeFiles(files: unknown): WorkFile[] {
  if (!Array.isArray(files)) return [];
  return files.filter((file: any) => file && typeof file === "object" && String(file.name || "").trim() && String(file.url || "").trim()).map((file: any) => ({
    name: String(file.name).trim(),
    url: String(file.url).trim(),
    size: Number.isFinite(Number(file.size)) ? Number(file.size) : 0,
    type: String(file.type || "").trim() || "application/octet-stream",
  }));
}

function normalizeLinks(links: unknown): string[] {
  if (!Array.isArray(links)) return [];
  return links.map((link: unknown) => String(link || "").trim()).filter(Boolean);
}


function idOf(value: any) {
  return value?._id?.toString?.() || value?.toString?.();
}

function timeNow() {
  const d = new Date();

  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`,

    time: `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`,
  };
}

function localDateTime(dateValue: unknown, timeValue: unknown) {
  const fallback = timeNow();

  const date = dateValue ? String(dateValue) : fallback.date;
  const time = timeValue ? String(timeValue) : fallback.time;

  const value = new Date(`${date}T${time}`);

  return Number.isNaN(value.getTime()) ? new Date() : value;
}

function minutesBetween(start: Date, end: Date) {
  return Math.max(
    0,
    Math.floor((end.getTime() - start.getTime()) / 60000)
  );
}

/**
 * Calculates actual worked minutes.
 *
 * Important:
 * - paused time is removed
 * - this can be used while a session is still In Progress
 * - it can also be used while the session is Paused
 */
function calculateWorkedMinutes(work: any, end: Date) {
  if (!work?.startTime) return 0;

  const start = new Date(work.startTime);

  if (Number.isNaN(start.getTime())) {
    return 0;
  }

  let totalMinutes = minutesBetween(start, end);

  totalMinutes -= Number(work.totalPausedMinutes || 0);

  // If currently paused, the current pause duration must also be removed.
  if (work.status === "Paused" && work.pausedAt) {
    totalMinutes -= minutesBetween(
      new Date(work.pausedAt),
      end
    );
  }

  return Math.max(0, totalMinutes);
}

async function getEmployee() {
  const user = await currentUser();

  if (!user) return null;

  if (Number(user.user_role) !== 2) return null;

  return user;
}

async function isAssigned(task: any, userId: string) {
  const assigned = Array.isArray(task.assign_to)
    ? task.assign_to
    : [];

  return assigned.some((id: any) => idOf(id) === userId);
}

export async function GET(request: Request) {
  try {
    await dbConnect();

    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const isAdmin = Number(user.user_role) === 1;

    const filter: Record<string, any> = {};

    if (isAdmin) {
      const managedEmployees = await User.find({
        $or: [
          { created_by: user._id },
          { _id: user._id },
        ],
      }).distinct("_id");

      const managedTasks = await Task.find({
        $or: [
          { created_by: user._id },
          { assign_to: { $in: managedEmployees } },
        ],
      }).distinct("_id");

      const employeeId = searchParams.get("employeeId");

      if (
        employeeId &&
        employeeId !== "all" &&
        employeeId !== "All"
      ) {
        filter.employeeId = employeeId;
      } else {
        filter.$or = [
          { employeeId: { $in: managedEmployees } },
          { taskId: { $in: managedTasks } },
        ];
      }
    } else {
      filter.employeeId = user._id;
    }

    // DATE FILTER
    const dateStr = searchParams.get("date");

    if (
      dateStr &&
      dateStr !== "all" &&
      dateStr !== "All"
    ) {
      const startOfDay = new Date(dateStr);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(dateStr);
      endOfDay.setUTCHours(23, 59, 59, 999);

      filter.date = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    // TASK FILTER
    const taskId = searchParams.get("taskId");

    if (
      taskId &&
      taskId !== "all" &&
      taskId !== "All"
    ) {
      if (mongoose.Types.ObjectId.isValid(taskId)) {
        filter.taskId = taskId;
      } else {
        const escapedTaskId = taskId.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

        const matchedTask = await Task.findOne({
          task_id: {
            $regex: `^${escapedTaskId}$`,
            $options: "i",
          },
        }).select("_id");

        if (matchedTask) {
          filter.taskId = matchedTask._id;
        } else {
          return NextResponse.json({
            success: true,
            data: [],
          });
        }
      }
    }

    // PROJECT FILTER
    const projectId = searchParams.get("projectId");

    if (
      projectId &&
      projectId !== "all" &&
      projectId !== "All"
    ) {
      const projectTaskIds = await Task.find({
        project_id: projectId,
      }).distinct("_id");

      if (filter.taskId) {
        const existingTaskId = String(filter.taskId);

        if (
          !projectTaskIds.some(
            (id: any) => String(id) === existingTaskId
          )
        ) {
          return NextResponse.json({
            success: true,
            data: [],
          });
        }
      } else {
        filter.taskId = {
          $in: projectTaskIds,
        };
      }
    }

    // STATUS FILTER
    const status = searchParams.get("status");

    if (
      status &&
      status !== "all" &&
      status !== "All"
    ) {
      if (
        status === "Partially Done" ||
        status === "Partially Completed"
      ) {
        filter.status = "Completed";
        filter.isFullyCompleted = false;
      } else if (status === "Completed") {
        filter.status = "Completed";
        filter.isFullyCompleted = true;
      } else {
        filter.status = status;
      }
    }

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 1000, 1),
      1000
    );

    const workSessions = await TaskWork.find(filter)
      .populate({
        path: "taskId",
        select:
          "task_id title description project_id task_status priority",
        populate: {
          path: "project_id",
          select: "name color",
        },
      })
      .populate(
        "employeeId",
        "full_name name email profile_picture"
      )
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const normalized = workSessions.map((w: any) => {
      const emp = w.employeeId || {};

      const empName =
        emp.full_name ||
        emp.name ||
        emp.email ||
        "Employee";

      /*
       * For paused sessions, make sure the frontend receives
       * the amount of work completed up to the pause.
       *
       * Older records may not have totalMinutes saved during
       * pause, so calculate it here as a fallback.
       */
      if (
        (
          w.status === "Paused" ||
          w.status === "Completed" ||
          w.status === "Partially Done" ||
          w.status === "Partially Completed"
        ) &&
        (!Number.isFinite(Number(w.totalMinutes)) ||
          Number(w.totalMinutes) <= 0)
      ) {
        const calculationEnd =
          w.status === "Paused" && w.pausedAt
            ? new Date(w.pausedAt)
            : w.endTime
              ? new Date(w.endTime)
              : new Date();

        w.totalMinutes = calculateWorkedMinutes(
          {
            ...w,
            // A completed/partially-done session is no longer
            // inside a live pause, so calculate against endTime.
            status:
              w.status === "Paused"
                ? "Paused"
                : "Completed",
          },
          calculationEnd
        );
      }

      w.files = Array.isArray(w.files) ? w.files : [];
      w.links = Array.isArray(w.links) ? w.links : [];

      return {
        ...w,

        _id: String(w._id),

        employeeId: {
          ...emp,
          _id: emp._id
            ? String(emp._id)
            : "",
          name: empName,
          full_name: empName,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: normalized,
    });
  } catch (error) {
    console.error(
      "GET /api/task-work Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load task logs",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const employee = await getEmployee();

    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only employees can perform task work",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const action = body.action as Action;
    const taskId = body.taskId?.toString();
    const workId = body.workId?.toString();

    const workNotes = typeof body.notes === "string" ? body.notes : "";
    const workLinks = normalizeLinks(body.links);
    const workFiles = normalizeFiles(body.files);

    if (
      ![
        "start",
        "pause",
        "resume",
        "complete",
      ].includes(action)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid action",
        },
        { status: 400 }
      );
    }

    if (!taskId && !workId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "taskId or workId is required",
        },
        { status: 400 }
      );
    }

    const employeeId = idOf(employee);

    let task: any = null;

    if (taskId) {
      task = await Task.findById(taskId);
    } else {
      const existing =
        await TaskWork.findById(workId);

      if (existing) {
        task = await Task.findById(
          existing.taskId
        );
      }
    }

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          message: "Task not found",
        },
        { status: 404 }
      );
    }

    if (!(await isAssigned(task, employeeId))) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You are not assigned to this task",
        },
        { status: 403 }
      );
    }

    const now = new Date();
    const current = timeNow();

    // START
    if (action === "start") {
      const existing =
        await TaskWork.findOne({
          taskId: task._id,
          employeeId: employee._id,
          status: {
            $in: [
              "In Progress",
              "Paused",
            ],
          },
        });

      if (existing) {
        return NextResponse.json({
          success: true,
          message:
            existing.status === "Paused"
              ? "Work is paused. Resume it instead."
              : "Work is already running.",
          data: existing,
        });
      }

      const work =
        await TaskWork.create({
          taskId: task._id,
          employeeId: employee._id,
          date: new Date(
            `${
              body.localDate ||
              current.date
            }T00:00:00`
          ),
          startTime: localDateTime(
            body.localDate ||
              current.date,
            body.localTime ||
              current.time
          ),
          status: "In Progress",
          notes: "",
          files: [],
          links: [],
          totalMinutes: 0,
          totalPausedMinutes: 0,
          isFullyCompleted: false,
        });

      await TaskLog.create({
        task_id: task._id,
        user_id: employee._id,
        status: "In Progress",
        action: "Started",
      });

      await syncTaskStatus(task._id);

      return NextResponse.json({
        success: true,
        message:
          "Work started successfully",
        data: work,
      });
    }

    // Find current work session for pause/resume/complete.
    const work = workId
      ? await TaskWork.findOne({
          _id: workId,
          taskId: task._id,
          employeeId: employee._id,
        })
      : await TaskWork.findOne({
          taskId: task._id,
          employeeId: employee._id,
          status: {
            $in: [
              "In Progress",
              "Paused",
            ],
          },
        }).sort({ createdAt: -1 });

    if (!work) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Work session not found",
        },
        { status: 404 }
      );
    }

    // PAUSE
    if (action === "pause") {
      if (work.status !== "In Progress") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Only active work can be paused",
          },
          { status: 400 }
        );
      }

      /*
       * IMPORTANT:
       * Save the actual worked minutes at the moment
       * the employee pauses.
       *
       * Example:
       * 10:00 start
       * 10:45 pause
       * totalMinutes = 45
       */
      work.totalMinutes =
        calculateWorkedMinutes(
          work,
          now
        );

      work.status = "Paused";
      work.pausedAt = now;
      work.updatedAt = now;

      await work.save();

      await TaskLog.create({
        task_id: task._id,
        user_id: employee._id,
        status: "Paused",
        action: "Paused",
      });

      await syncTaskStatus(task._id);

      return NextResponse.json({
        success: true,
        message:
          "Work paused successfully",
        data: work,
      });
    }

    // RESUME
    if (action === "resume") {
      if (work.status !== "Paused") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Only paused work can be resumed",
          },
          { status: 400 }
        );
      }

      if (work.pausedAt) {
        work.totalPausedMinutes =
          Number(
            work.totalPausedMinutes || 0
          ) +
          minutesBetween(
            new Date(work.pausedAt),
            now
          );
      }

      work.pausedAt = null;
      work.status = "In Progress";
      work.updatedAt = now;

      await work.save();

      await TaskLog.create({
        task_id: task._id,
        user_id: employee._id,
        status: "In Progress",
        action: "Resumed",
      });

      await syncTaskStatus(task._id);

      return NextResponse.json({
        success: true,
        message:
          "Work resumed successfully",
        data: work,
      });
    }

    // COMPLETE / PARTIALLY DONE
    if (action === "complete") {
      if (work.status === "Completed") {
        return NextResponse.json({
          success: true,
          message:
            "Work is already completed",
          data: work,
        });
      }

      if (
        work.status === "Paused" &&
        work.pausedAt
      ) {
        work.totalPausedMinutes =
          Number(
            work.totalPausedMinutes || 0
          ) +
          minutesBetween(
            new Date(work.pausedAt),
            now
          );

        work.pausedAt = null;
      }

      if (!work.startTime) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Work start time is missing",
          },
          { status: 400 }
        );
      }

      const totalMinutes =
        calculateWorkedMinutes(
          {
            ...work.toObject(),
            status: "In Progress",
            pausedAt: null,
          },
          now
        );

      work.endTime =
        localDateTime(
          body.localDate ||
            current.date,
          body.localTime ||
            current.time
        );

      work.totalMinutes =
        totalMinutes;

      work.notes = workNotes || work.notes || "";

      // Save attachments on this exact work session.
      work.files = workFiles;
      work.links = workLinks;

      // Keep the existing Task-level Files/Links behavior too.
      const existingTaskFiles = Array.isArray(task.files) ? task.files : [];
      const existingTaskUrls = Array.isArray(task.urls) ? task.urls : [];

      const existingFileKeys = new Set(
        existingTaskFiles.map((file: any) => `${String(file?.name || "")}|${String(file?.url || "")}`)
      );

      for (const file of workFiles) {
        const key = `${file.name}|${file.url}`;
        if (!existingFileKeys.has(key)) {
          existingTaskFiles.push(file);
          existingFileKeys.add(key);
        }
      }

      for (const link of workLinks) {
        if (!existingTaskUrls.includes(link)) existingTaskUrls.push(link);
      }

      task.files = existingTaskFiles;
      task.urls = existingTaskUrls;

      await task.save();

      /*
       * false = Partially Done
       * true  = Fully Completed
       */
      work.isFullyCompleted =
        Boolean(
          body.isFullyCompleted
        );

      work.status = "Completed";
      work.updatedAt = now;

      await work.save();

      await TaskLog.create({
        task_id: task._id,
        user_id: employee._id,
        status:
          work.isFullyCompleted
            ? "Completed"
            : "Partially Done",
        action: "Completed",
      });

      await syncTaskStatus(task._id);

      return NextResponse.json({
        success: true,
        message:
          work.isFullyCompleted
            ? "Work completed successfully"
            : "Work marked as partially done",
        data: work,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Unsupported action",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "POST /api/task-work error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update task work",
      },
      { status: 500 }
    );
  }
}
