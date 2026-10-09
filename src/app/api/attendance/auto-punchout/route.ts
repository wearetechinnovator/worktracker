import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import Attendance from "@/models/Attendance";

function getAttendanceDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getISTParts(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);

  return { hour, minute };
}

function getISTDayEnd(attendanceDate: string): Date {
  // 23:59 IST = 18:29 UTC.
  return new Date(`${attendanceDate}T23:59:00+05:30`);
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized cron request.",
        },
        { status: 401 }
      );
    }

    const now = new Date();
    const { hour, minute } = getISTParts(now);


    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "true";
    const isLateEveningWindow = hour === 23 && minute >= 30;
    await dbConnect();

    const todayAttendanceDate = getAttendanceDate(now);

    const openAttendances = await Attendance.find({
      punch_in_on: { $ne: null },
      punch_out_on: null,
    });

    let punchedOutCount = 0;
    const punchedOutAttendanceDates = new Set<string>();

    for (const attendance of openAttendances) {
      const attendanceDate =
        attendance.attendance_date ||
        getAttendanceDate(new Date(attendance.punch_in_on));

      // Catch up records missed while the app was asleep. The current day's
      // record is only eligible during the normal 11:30 PM window.
      const isStale = attendanceDate < todayAttendanceDate;
      if (!isStale && !isLateEveningWindow && !force) {
        continue;
      }

      attendance.attendance_date = attendanceDate;
      attendance.punch_out_on = getISTDayEnd(attendanceDate);
      attendance.punch_out_source = "system";
      attendance.allow_punch_out_by = null;
      attendance.punch_out_ip = null;
      attendance.punch_out_geo = [];
      attendance.punch_out_reason =
        "System generated punch out at 11:59 PM";
      attendance.punch_out_browser = "System / Automatic Cron";
      attendance.punch_out_systemid = "SYSTEM_AUTO_PUNCH_OUT";

      await attendance.save();
      punchedOutCount += 1;
      punchedOutAttendanceDates.add(attendanceDate);
    }

    return NextResponse.json({
      success: true,
      currentIST: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      punchedOutAttendanceDates: [...punchedOutAttendanceDates],
      punchedOutCount,
      message:
        punchedOutCount > 0
          ? `${punchedOutCount} attendance record(s) were automatically punched out.`
          : "No open attendance records required automatic punch-out.",
    });
  } catch (error) {
    console.error("GET /api/attendance/auto-punchout error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to run automatic punch-out.",
      },
      { status: 500 }
    );
  }
}
