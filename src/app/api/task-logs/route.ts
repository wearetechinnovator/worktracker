import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { currentUser } from "@/lib/auth";
import TaskLog from "@/models/TaskLog";

export async function GET(request: Request) {
  try {
    await dbConnect();
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filter: Record<string, unknown> = {
      user_id: user._id,
    };

    const taskId = searchParams.get("taskId");
    const status = searchParams.get("status");
    const action = searchParams.get("action");

    if (taskId) filter.task_id = taskId;
    if (status) filter.status = status;
    if (action) filter.action = action;

    const logs = await TaskLog.find(filter)
      .populate("task_id", "title project_id")
      .populate("user_id", "full_name email profile_picture")
      .sort({ timestamp: -1 })
      .limit(Math.min(Number(searchParams.get("limit")) || 500, 500))
      .lean();

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error("GET /api/task-logs Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load task logs" },
      { status: 500 }
    );
  }
}
