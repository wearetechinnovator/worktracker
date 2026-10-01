/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/dbConnect";
import Task from "@/models/Task";
import TaskLog from "@/models/TaskLog";
import { currentUser } from "@/lib/auth";

const EMPLOYEE_STATUSES = [
  "In Progress",
  "Paused",
  "Partially Done",
  "Partially Completed",
  "Review",
] as const;

const ALL_STATUSES = [
  "To Do",
  "In Progress",
  "Paused",
  "Partially Done",
  "Partially Completed",
  "Review",
  "Completed",
] as const;

function normalizeStatus(value: unknown) {
  if (value === "Partially Completed") return "Partially Done";
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Valid task ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const status = normalizeStatus(body.status);
    const files = Array.isArray(body.files) ? body.files : [];
    const links = Array.isArray(body.links)
      ? body.links.map((value: unknown) => String(value).trim()).filter(Boolean)
      : [];

    if (!message && !status && files.length === 0 && links.length === 0) {
      return NextResponse.json(
        { success: false, message: "Please add an update, status, file, or link." },
        { status: 400 }
      );
    }

    const isAdmin = Number(user.user_role) === 1;
    const accessFilter = isAdmin
      ? { $or: [{ created_by: user._id }, { admin_id: user._id }] }
      : { assign_to: user._id };

    const task = await Task.findOne({
      _id: id,
      status: { $ne: 0 },
      ...accessFilter,
    });

    if (!task) {
      return NextResponse.json(
        { success: false, message: "You do not have access to update this task." },
        { status: 403 }
      );
    }

    if (status && !ALL_STATUSES.includes(status as (typeof ALL_STATUSES)[number])) {
      return NextResponse.json(
        { success: false, message: "Invalid task status." },
        { status: 400 }
      );
    }

    if (!isAdmin && status === "Completed") {
      return NextResponse.json(
        {
          success: false,
          message: "Employees must submit the task for review before it can be completed.",
        },
        { status: 403 }
      );
    }

    if (!isAdmin && status && !EMPLOYEE_STATUSES.includes(status as (typeof EMPLOYEE_STATUSES)[number])) {
      return NextResponse.json(
        { success: false, message: "This status cannot be selected by an employee." },
        { status: 403 }
      );
    }

    const now = new Date();
    const actorId = new mongoose.Types.ObjectId(String(user._id));

    if (files.length > 0) {
      const existingFiles = Array.isArray(task.files) ? task.files : [];
      const existingKeys = new Set(
        existingFiles.map((file: any) => String(file?.url || file?.name || ""))
      );

      for (const file of files) {
        const key = String(file?.url || file?.name || "");
        if (key && !existingKeys.has(key)) {
          existingFiles.push(file);
          existingKeys.add(key);
        }
      }

      task.files = existingFiles;
    }

    if (links.length > 0) {
      const existingUrls = Array.isArray(task.urls) ? task.urls : [];
      const existingKeys = new Set(
        existingUrls.map((url: any) => String(url?.url || url?.link || url || "").trim())
      );

      for (const link of links) {
        if (!existingKeys.has(link)) {
          existingUrls.push(link as any);
          existingKeys.add(link);
        }
      }

      task.urls = existingUrls;
    }

    if (status) {
      task.task_status = status;
      if (status === "Completed") {
        task.completion_date = now;
        task.completion_time = now;
      }
    }

    task.modified_by = actorId;
    task.modified_on = now;
    await task.save();

    const action = status ? `Updated task status to ${status}` : "Posted a task update";
    await TaskLog.create({
      task_id: task._id,
      user_id: actorId,
      status: task.task_status,
      action: message ? `${action}: ${message}` : action,
      message,
      files,
      links,
      timestamp: now,
    });

    const populatedTask = await Task.findById(task._id)
      .populate("project_id", "name color")
      .populate("assign_to", "full_name name email profile_picture avatarColor")
      .populate("created_by", "full_name name email avatarColor")
      .populate("comments.user_id", "full_name name email profile_picture avatarColor")
      .lean();

    return NextResponse.json({
      success: true,
      message: status === "Review"
        ? "Task submitted for review successfully."
        : "Task update posted successfully.",
      data: populatedTask,
    });
  } catch (error: any) {
    console.error("POST /api/tasks/[id]/update ERROR:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update task" },
      { status: 500 }
    );
  }
}