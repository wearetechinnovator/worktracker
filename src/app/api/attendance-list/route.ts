import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Attendance from "@/models/Attendance";
import AttendanceRequest from "@/models/AttendanceRequest";
import User from "@/models/User";
import { currentUser } from "@/lib/auth";

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isValidAttendanceDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function getPunchMode(allowedBy: unknown, employeeId: unknown) {
  if (!allowedBy) return "Manual";
  return String(allowedBy) === String(employeeId)
    ? "Manual"
    : "Force / Admin";
}

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    if (Number(user.user_role) !== 1) {
      return NextResponse.json(
        { success: false, message: "Only admins can view attendance." },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const params = url.searchParams;

    const requestedPage = Number(params.get("page") || "1");
    const requestedLimit = Number(params.get("limit") || "10");
    const page = Number.isFinite(requestedPage)
      ? Math.max(Math.floor(requestedPage), 1)
      : 1;
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.floor(requestedLimit), 1), 100)
      : 10;

    const search = (params.get("search") || "").trim();
    const date = (params.get("date") || "").trim();
    const requestStatus = (params.get("requestStatus") || "").trim();

    if (date && !isValidAttendanceDate(date)) {
      return NextResponse.json(
        { success: false, message: "Invalid attendance date." },
        { status: 400 }
      );
    }

    const allowedStatuses = new Set([
      "",
      "Pending",
      "Approved",
      "Rejected",
      "None",
    ]);

    if (!allowedStatuses.has(requestStatus)) {
      return NextResponse.json(
        { success: false, message: "Invalid request status." },
        { status: 400 }
      );
    }

    // Only employees directly created by the logged-in admin are visible.
    const employeeFilter: Record<string, unknown> = {
      created_by: user._id,
      user_role: 2,
    };

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      employeeFilter.$or = [
        { full_name: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const employees = await User.find(employeeFilter)
      .select("_id full_name email designation profile_picture")
      .lean<any[]>();

    if (!employees.length) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    const employeeIds = employees.map((employee) => employee._id);

    // Keep Attendance and AttendanceRequest as separate queries. This is
    // simpler and safer than using $unionWith/$facet for this page.
    const attendanceFilter: Record<string, unknown> = {
      user_id: { $in: employeeIds },
    };

    if (date) {
      attendanceFilter.attendance_date = date;
    }

    const requestFilter: Record<string, unknown> = {
      employee_id: { $in: employeeIds },
    };

    if (date) {
      requestFilter.attendance_date = date;
    }

    const [attendanceRecords, requestRecords] = await Promise.all([
      Attendance.find(attendanceFilter).lean<any[]>(),
      AttendanceRequest.find(requestFilter)
        .select(
          "_id employee_id attendance_date request_type reason status requested_at requested_punch_at reviewed_by reviewed_at rejection_reason approval_reason used_at ip browser geo systemid"
        )
        .populate("reviewed_by", "full_name email")
        .lean<any[]>(),
    ]);

    type MergedRow = {
      userId: string;
      attendanceDate: string;
      attendance: any | null;
      requests: any[];
    };

    const rowMap = new Map<string, MergedRow>();

    const ensureRow = (userId: unknown, attendanceDate: string) => {
      const key = `${String(userId)}:${attendanceDate}`;
      let row = rowMap.get(key);

      if (!row) {
        row = {
          userId: String(userId),
          attendanceDate,
          attendance: null,
          requests: [],
        };
        rowMap.set(key, row);
      }

      return row;
    };

    for (const attendance of attendanceRecords) {
      const attendanceDate = String(attendance.attendance_date || "");
      if (!attendanceDate) continue;

      const row = ensureRow(attendance.user_id, attendanceDate);
      row.attendance = attendance;
    }

    for (const request of requestRecords) {
      const attendanceDate = String(request.attendance_date || "");
      if (!attendanceDate) continue;

      const row = ensureRow(request.employee_id, attendanceDate);
      row.requests.push(request);
    }

    const employeeMap = new Map<string, any>(
      employees.map((employee) => [String(employee._id), employee])
    );

    let mergedRows = Array.from(rowMap.values());

    // requestStatus is a row-level filter. "None" means neither punch-in
    // nor punch-out request exists for that employee/date.
    if (requestStatus) {
      mergedRows = mergedRows.filter((row) => {
        if (requestStatus === "None") return row.requests.length === 0;
        return row.requests.some(
          (request) => request.status === requestStatus
        );
      });
    }

    mergedRows.sort((a, b) => {
      const dateCompare = b.attendanceDate.localeCompare(a.attendanceDate);
      if (dateCompare !== 0) return dateCompare;

      const employeeA = employeeMap.get(a.userId)?.full_name || "";
      const employeeB = employeeMap.get(b.userId)?.full_name || "";
      return employeeA.localeCompare(employeeB);
    });

    const total = mergedRows.length;
    const totalPages = Math.ceil(total / limit);
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const start = (safePage - 1) * limit;
    const pagedRows = mergedRows.slice(start, start + limit);

    const data = pagedRows.map((row) => {
      const employee = employeeMap.get(row.userId) || null;
      const attendance = row.attendance;

      const requests = [...row.requests].sort((a, b) => {
        const aTime = toDateOrNull(a.requested_at)?.getTime() || 0;
        const bTime = toDateOrNull(b.requested_at)?.getTime() || 0;
        return bTime - aTime;
      });

      const punchInRequests = requests.filter(
        (request) => request.request_type === "punchIn"
      );
      const punchOutRequests = requests.filter(
        (request) => request.request_type === "punchOut"
      );

      const latestRequest = requests[0] || null;
      const latestPunchInRequest = punchInRequests[0] || null;
      const latestPunchOutRequest = punchOutRequests[0] || null;

      const serializeRequest = (request: any) => {
        if (!request) return null;

        return {
          _id: String(request._id),
          request_type: request.request_type,
          reason: request.reason || null,
          status: request.status || "Pending",
          requested_at: toDateOrNull(request.requested_at),
          requested_punch_at: toDateOrNull(request.requested_punch_at),
          reviewed_at: toDateOrNull(request.reviewed_at),
          rejection_reason: request.rejection_reason || null,
          approval_reason: request.approval_reason || null,
          used_at: toDateOrNull(request.used_at),
          reviewed_by: request.reviewed_by
            ? {
                _id: String(request.reviewed_by._id),
                full_name: request.reviewed_by.full_name || null,
                email: request.reviewed_by.email || null,
              }
            : null,
          ip: request.ip || null,
          browser: request.browser || null,
          systemid: request.systemid || null,
        };
      };

      return {
        _id: `${row.userId}-${row.attendanceDate}`,
        employee: employee
          ? {
              _id: String(employee._id),
              full_name: employee.full_name || "Unknown Employee",
              email: employee.email || null,
              designation: employee.designation || null,
              profile_picture: employee.profile_picture || null,
            }
          : null,

        attendance_date: row.attendanceDate,

        punch_in_on: attendance?.punch_in_on
          ? toDateOrNull(attendance.punch_in_on)
          : null,
        punch_out_on: attendance?.punch_out_on
          ? toDateOrNull(attendance.punch_out_on)
          : null,

        // allow_*_by is the field available in the current Attendance model
        // for identifying whether the punch was performed under another
        // user's/admin allowance. It is therefore used for the displayed
        // Manual vs Force/Admin label.
        punch_in_mode: attendance
          ? getPunchMode(attendance.allow_punch_in_by, row.userId)
          : null,

        punch_out_mode: attendance
          ? attendance.punch_out_source === "system"
            ? "System / Auto"
            : getPunchMode(attendance.allow_punch_out_by, row.userId)
          : null,

        punch_out_source: attendance?.punch_out_source || null,

        punch_in_reason: attendance?.punch_in_reason || null,
        punch_out_reason: attendance?.punch_out_reason || null,

        punch_in_ip: attendance?.punch_in_ip || null,
        punch_out_ip: attendance?.punch_out_ip || null,
        punch_in_browser: attendance?.punch_in_browser || null,
        punch_out_browser: attendance?.punch_out_browser || null,
        punch_in_systemid: attendance?.punch_in_systemid || null,
        punch_out_systemid: attendance?.punch_out_systemid || null,

        requests: requests.map(serializeRequest),
        latest_request: serializeRequest(latestRequest),
        punch_in_request: latestPunchInRequest
          ? serializeRequest(latestPunchInRequest)
          : null,
        punch_out_request: latestPunchOutRequest
          ? serializeRequest(latestPunchOutRequest)
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("GET /api/attendance-list error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load attendance list.",
      },
      { status: 500 }
    );
  }
}
