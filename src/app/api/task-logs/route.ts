import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { currentUser } from "@/lib/auth";
import TaskLog from "@/models/TaskLog";
import User from "@/models/User";
import Task from "@/models/Task";

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
    const isAdmin = Number(user.user_role) === 1;
    const filter: Record<string, any> = {};

    const requestedTaskId = searchParams.get("taskId") || searchParams.get("task_id");
    let resolvedTaskId: any = null;
    if (requestedTaskId && requestedTaskId !== "All") {
      if (mongoose.Types.ObjectId.isValid(requestedTaskId)) {
        resolvedTaskId = requestedTaskId;
      } else {
        const foundTask = await Task.findOne({ task_id: requestedTaskId.trim() }).select("_id");
        if (foundTask) resolvedTaskId = foundTask._id;
      }
    }

    if (isAdmin) {
      // Find all employees under this admin
      const managedEmployees = await User.find({
        $or: [{ created_by: user._id }, { _id: user._id }]
      }).distinct("_id");

      // Find all tasks created by or assigned under this admin
      const managedTasks = await Task.find({
        $or: [{ created_by: user._id }, { assign_to: user._id }]
      }).distinct("_id");

      const employeeId = searchParams.get("employeeId") || searchParams.get("user_id");

      if (employeeId && employeeId !== "All" && mongoose.Types.ObjectId.isValid(employeeId)) {
        filter.user_id = employeeId;
      }

      if (resolvedTaskId) {
        filter.task_id = resolvedTaskId;
      } else if (!filter.user_id) {
        filter.$or = [
          { user_id: { $in: managedEmployees } },
          { task_id: { $in: managedTasks } }
        ];
      }
    } else {
      // Employee can only see their own logs
      filter.user_id = user._id;
      if (resolvedTaskId) {
        filter.task_id = resolvedTaskId;
      }
    }

    const status = searchParams.get("status");
    const action = searchParams.get("action");

    if (status && status !== "All") filter.status = status;
    if (action && action !== "All") filter.action = action;

    const logs = await TaskLog.find(filter)
      .populate("task_id", "title task_id project_id")
      .populate("user_id", "full_name name email profile_picture")
      .sort({ timestamp: -1, createdAt: -1 })
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
