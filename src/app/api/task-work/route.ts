import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { currentUser } from "@/lib/auth";
import Task from "@/models/Task";
import TaskWork from "@/models/TaskWork";
import TaskLog from "@/models/TaskLog";

type Action = "start" | "pause" | "resume" | "complete";

function idOf(value: any) {
  return value?._id?.toString?.() || value?.toString?.();
}

function timeNow() {
  const d = new Date();
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`,
  };
}

function localDateTime(dateValue: unknown, timeValue: unknown) {
  const date = dateValue ? String(dateValue) : timeNow().date;
  const time = timeValue ? String(timeValue) : timeNow().time;
  const value = new Date(`${date}T${time}`);
  return Number.isNaN(value.getTime()) ? new Date() : value;
}

function minutesBetween(start: Date, end: Date) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
}

async function getEmployee() {
  const user = await currentUser();
  if (!user) return null;

  if (Number(user.user_role) !== 2) return null;
  return user;
}

async function isAssigned(task: any, userId: string) {
  const assigned = Array.isArray(task.assign_to) ? task.assign_to : [];
  return assigned.some((id: any) => idOf(id) === userId);
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isAdmin = Number(user.user_role) === 1;
    const filter: Record<string, any> = {};

    if (isAdmin) {
      const employeeId = searchParams.get("employeeId");
      if (employeeId) filter.employeeId = employeeId;
    } else {
      filter.employeeId = user._id;
    }

    const taskId = searchParams.get("taskId");
    const status = searchParams.get("status");

    if (taskId) filter.taskId = taskId;
    if (status) filter.status = status;

    const workSessions = await TaskWork.find(filter)
      .populate("taskId", "title project_id")
      .populate("employeeId", "full_name email profile_picture")
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(searchParams.get("limit")) || 500, 500))
      .lean();

    return NextResponse.json({ success: true, data: workSessions });
  } catch (error) {
    console.error("GET /api/task-work Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load task logs" },
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
        { success: false, message: "Only employees can perform task work" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const action = body.action as Action;
    const taskId = body.taskId?.toString();
    const workId = body.workId?.toString();

    if (!["start", "pause", "resume", "complete"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Invalid action" },
        { status: 400 }
      );
    }

    if (!taskId && !workId) {
      return NextResponse.json(
        { success: false, message: "taskId or workId is required" },
        { status: 400 }
      );
    }

    const employeeId = idOf(employee);

    let task: any = null;

    if (taskId) {
      task = await Task.findById(taskId);
    } else {
      const existing = await TaskWork.findById(workId);
      if (existing) task = await Task.findById(existing.taskId);
    }

    if (!task) {
      return NextResponse.json(
        { success: false, message: "Task not found" },
        { status: 404 }
      );
    }

    if (!(await isAssigned(task, employeeId))) {
      return NextResponse.json(
        { success: false, message: "You are not assigned to this task" },
        { status: 403 }
      );
    }

    const now = new Date();
    const current = timeNow();

    // START
    if (action === "start") {
      const existing = await TaskWork.findOne({
        taskId: task._id,
        employeeId: employee._id,
        status: { $in: ["In Progress", "Paused"] },
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

      const work = await TaskWork.create({
        taskId: task._id,
        employeeId: employee._id,
        date: new Date(`${body.localDate || current.date}T00:00:00`),
        startTime: localDateTime(body.localDate || current.date, body.localTime || current.time),
        status: "In Progress",
      });

      await TaskLog.create({
        task_id: task._id,
        user_id: employee._id,
        status: "In Progress",
        action: "Started",
      });

      return NextResponse.json({
        success: true,
        message: "Work started successfully",
        data: work,
      });
    }

    // Find current work session for pause/resume.
    const work = workId
      ? await TaskWork.findOne({
          _id: workId,
          taskId: task._id,
          employeeId: employee._id,
        })
      : await TaskWork.findOne({
          taskId: task._id,
          employeeId: employee._id,
          status: { $in: ["In Progress", "Paused"] },
        }).sort({ createdAt: -1 });

    if (!work) {
      return NextResponse.json(
        { success: false, message: "Work session not found" },
        { status: 404 }
      );
    }

    // PAUSE
    if (action === "pause") {
      if (work.status !== "In Progress") {
        return NextResponse.json(
          { success: false, message: "Only active work can be paused" },
          { status: 400 }
        );
      }

      work.status = "Paused";
      work.pausedAt = now;
      work.updatedAt = now;
      await work.save();

      await TaskLog.create({
        task_id: task._id,
        user_id: employee._id,
        status: "In Progress",
        action: "Paused",
      });

      return NextResponse.json({
        success: true,
        message: "Work paused successfully",
        data: work,
      });
    }

    // RESUME
    if (action === "resume") {
      if (work.status !== "Paused") {
        return NextResponse.json(
          { success: false, message: "Only paused work can be resumed" },
          { status: 400 }
        );
      }

      if (work.pausedAt) {
        work.totalPausedMinutes =
          Number(work.totalPausedMinutes || 0) +
          minutesBetween(new Date(work.pausedAt), now);
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

      return NextResponse.json({
        success: true,
        message: "Work resumed successfully",
        data: work,
      });
    }

    // COMPLETE
    if (action === "complete") {
      if (work.status === "Completed") {
        return NextResponse.json({
          success: true,
          message: "Work is already completed",
          data: work,
        });
      }

      if (work.status === "Paused" && work.pausedAt) {
        work.totalPausedMinutes =
          Number(work.totalPausedMinutes || 0) +
          minutesBetween(new Date(work.pausedAt), now);
        work.pausedAt = null;
      }

      if (!work.startTime) {
        return NextResponse.json(
          { success: false, message: "Work start time is missing" },
          { status: 400 }
        );
      }

      const start = new Date(work.startTime);

      let totalMinutes = minutesBetween(start, now);
      totalMinutes = Math.max(
        0,
        totalMinutes - Number(work.totalPausedMinutes || 0)
      );

      work.endTime = localDateTime(body.localDate || current.date, body.localTime || current.time);
      work.totalMinutes = totalMinutes;
      work.notes = body.notes || work.notes || "";
      work.isFullyCompleted = Boolean(body.isFullyCompleted);
      work.status = "Completed";
      work.updatedAt = now;

      await work.save();

      await TaskLog.create({
        task_id: task._id,
        user_id: employee._id,
        status: "Completed",
        action: "Completed",
      });

      return NextResponse.json({
        success: true,
        message: "Work completed successfully",
        data: work,
      });
    }

    return NextResponse.json(
      { success: false, message: "Unsupported action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/task-work error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update task work",
      },
      { status: 500 }
    );
  }
}
