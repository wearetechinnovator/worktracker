import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import AttendanceRequest from "@/models/AttendanceRequest";
import User from "@/models/User";
import Settings from "@/models/Settings";
import Attendance from "@/models/Attendance";
import Notification from "@/models/Notification";
import { currentUser } from "@/lib/auth";

function getClientIp(req: Request): string {
  const forwardedFor =
    req.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.headers.get("x-real-ip") || "127.0.0.1";
}

function getClientBrowser(req: Request): string {
  return (
    req.headers.get("user-agent") ||
    "Unknown Browser"
  );
}

function getAttendanceDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function POST(req: Request) {
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

    if (Number(user.user_role) !== 2) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only employees can submit attendance requests.",
        },
        { status: 403 }
      );
    }

    const body =
      await req.json().catch(() => ({}));

    const requestType =
      body.requestType;

    const reason =
      String(body.reason || "").trim();

    const geo =
      Array.isArray(body.geo)
        ? body.geo
        : [];

    const systemId =
      body.systemId || null;

    if (
      requestType !== "punchIn" &&
      requestType !== "punchOut"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid request type.",
        },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Reason is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Resolve employee's admin account.
     */
    let admin = user.created_by
      ? await User.findById(user.created_by)
      : null;

    if (!admin || Number(admin.user_role) !== 1) {
      admin = await User.findOne({ user_role: 1, status: true });
    }

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "No active admin account was found.",
        },
        { status: 400 }
      );
    }

    /*
     * Employees inherit attendance settings from their admin.
     */
    const settings =
      (user.settings_id
        ? await Settings.findOne({
          _id: user.settings_id,
          owner_user_id: admin._id,
          status: 1,
        })
        : null) ||
      (await Settings.findOne({
        owner_user_id: admin._id,
        status: 1,
      })) ||
      (await Settings.findOne({
        owner_user_id: admin._id,
      }));

    if (!settings) {
      return NextResponse.json(
        {
          success: false,
          message: "Attendance settings were not found.",
        },
        { status: 400 }
      );
    }

    let openAttendance = null;

    /*
     * Don't allow Punch In request if employee already has an active punch-in
     * or has already completed attendance today.
     */
    if (requestType === "punchIn") {
      openAttendance = await Attendance.findOne({
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

      const attendanceDate = getAttendanceDate();
      const todayAttendance = await Attendance.findOne({
        user_id: user._id,
        attendance_date: attendanceDate,
      });

      if (todayAttendance?.punch_in_on && todayAttendance?.punch_out_on) {
        return NextResponse.json(
          {
            success: false,
            message: "Today's attendance is already completed.",
          },
          { status: 400 }
        );
      }
    }

    /*
     * Punch Out request requires an active punch-in.
     */
    if (requestType === "punchOut") {
      openAttendance = await Attendance.findOne({
        user_id: user._id,
        punch_in_on: {
          $ne: null,
        },
        punch_out_on: null,
      }).sort({
        punch_in_on: -1,
      });

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

    const attendanceDate =
      requestType === "punchOut" && openAttendance?.attendance_date
        ? String(openAttendance.attendance_date)
        : getAttendanceDate();

    /*
     * Check for existing pending request.
     */
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

    const request =
      await AttendanceRequest.create({
        employee_id: user._id,
        admin_id: admin._id,

        attendance_date: attendanceDate,

        request_type: requestType,

        reason,

        requested_at: new Date(),

        requested_punch_at: new Date(),

        ip: getClientIp(req),

        browser: getClientBrowser(req),

        geo,

        systemid: systemId,

        status: "Pending",
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

    return NextResponse.json(
      {
        success: true,
        message:
          `${requestType === "punchIn"
            ? "Punch In"
            : "Punch Out"
          } request sent to admin successfully.`,

        data: request,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error(
      "POST /api/attendance/request error:",
      error
    );

    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You already have a pending request for this action.",
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