import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import AttendanceRequest from "@/models/AttendanceRequest";
import User from "@/models/User";
import Settings from "@/models/Settings";
import Attendance from "@/models/Attendance";
import Notification from "@/models/Notification";
import { currentUser } from "@/lib/auth";
import { sendPunchRequestMail } from "@/lib/mailer";

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

function getClientBrowser(req: Request): string {
  return req.headers.get("user-agent") || "Unknown Browser";
}

function getAttendanceDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function getUserSettings(user: any) {
  const adminId = user.created_by;
  if (!adminId) return null;

  if (user.settings_id) {
    const direct = await Settings.findOne({
      _id: user.settings_id,
      owner_user_id: adminId,
      status: 1,
    });
    if (direct) return direct;
  }

  return Settings.findOne({
    owner_user_id: adminId,
    status: 1,
  });
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    if (Number(user.user_role) !== 2) {
      return NextResponse.json(
        {
          success: false,
          message: "Only employees can submit attendance requests.",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const requestType = body.requestType;
    const reason = String(body.reason || "").trim();
    const geo = Array.isArray(body.geo) ? body.geo : [];
    const systemId = body.systemId || null;

    if (requestType !== "punchIn" && requestType !== "punchOut") {
      return NextResponse.json(
        { success: false, message: "Invalid request type." },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { success: false, message: "Reason is required." },
        { status: 400 }
      );
    }

    const admin = user.created_by
      ? await User.findOne({ _id: user.created_by, user_role: 1, status: true })
      : null;

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "No active admin account was found." },
        { status: 400 }
      );
    }

    const settings = await getUserSettings(user);

    if (!settings) {
      return NextResponse.json(
        { success: false, message: "Attendance settings were not found." },
        { status: 400 }
      );
    }

    const now = new Date();
    const attendanceDate = getAttendanceDate(now);

    /*
     * A request is an ALLOWANCE only.
     * It never creates or changes Attendance.
     */
    if (requestType === "punchIn") {
      const openAttendance = await Attendance.findOne({
        user_id: user._id,
        punch_in_on: { $ne: null },
        punch_out_on: null,
      });

      if (openAttendance) {
        return NextResponse.json(
          {
            success: false,
            message: "You are already punched in. Please punch out first.",
          },
          { status: 400 }
        );
      }

      const todayAttendance = await Attendance.findOne({
        user_id: user._id,
        attendance_date: attendanceDate,
      });

      if (todayAttendance?.punch_in_on) {
        return NextResponse.json(
          {
            success: false,
            message: "You have already punched in for today.",
          },
          { status: 400 }
        );
      }
    }

    if (requestType === "punchOut") {
      const openAttendance = await Attendance.findOne({
        user_id: user._id,
        punch_in_on: { $ne: null },
        punch_out_on: null,
      }).sort({ punch_in_on: -1 });

      if (!openAttendance) {
        return NextResponse.json(
          {
            success: false,
            message: "You don't have an active punch-in session.",
          },
          { status: 400 }
        );
      }
    }

    const existingPending = await AttendanceRequest.findOne({
      employee_id: user._id,
      attendance_date: attendanceDate,
      request_type: requestType,
      status: "Pending",
    });

    if (existingPending) {
      return NextResponse.json(
        {
          success: false,
          message: "You already have a pending request for this action.",
        },
        { status: 409 }
      );
    }

    const existingApproved = await AttendanceRequest.findOne({
      employee_id: user._id,
      attendance_date: attendanceDate,
      request_type: requestType,
      status: "Approved",
      used_at: null,
    });

    if (existingApproved) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your request has already been approved. Please click the Punch button to complete the action.",
          data: existingApproved,
        },
        { status: 409 }
      );
    }

    const request = await AttendanceRequest.create({
      employee_id: user._id,
      admin_id: admin._id,
      attendance_date: attendanceDate,
      request_type: requestType,
      reason,
      requested_at: now,
      requested_punch_at: now,
      ip: getClientIp(req),
      browser: getClientBrowser(req),
      geo,
      systemid: systemId,
      status: "Pending",
      used_at: null,
    });

    try {
      await Notification.create({
        userId: admin._id,
        title: "New Attendance Request",
        message: `${user.full_name || "An employee"} submitted a ${requestType === "punchIn" ? "Punch In" : "Punch Out"} request.`,
        type: "punch",
        link: "/admin/attendance",
        read: false,
      });
    } catch (notifErr) {
      console.error("Failed to create admin notification:", notifErr);
    }

    if (admin.email) {
      sendPunchRequestMail({
        to: admin.email,
        employeeName: user.full_name || user.name || "Employee",
        employeeEmail: user.email || "",
        requestType,
        reason,
        date: attendanceDate,
        requestedAt: now,
        ip: getClientIp(req),
        browser: getClientBrowser(req),
      }).catch((mailErr) => {
        console.error("Failed to send punch request email to admin:", mailErr);
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `${requestType === "punchIn" ? "Punch In" : "Punch Out"} request sent to admin successfully. Approval only gives you permission; you must click the Punch button after approval to complete the action.`,
        data: request,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/attendance/request error:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "You already have a pending or approved attendance allowance for this action.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to submit attendance request.",
      },
      { status: 500 }
    );
  }
}
