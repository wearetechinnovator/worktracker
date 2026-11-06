/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Attendance from "@/models/Attendance";
import User from "@/models/User";
import Project from "@/models/Project";
import Settings from "@/models/Settings";
import { currentUser } from "@/lib/auth";

function formatTime(dateValue: unknown): string | null {
  if (!dateValue) return null;
  const d = new Date(String(dateValue));
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function getDaysBetween(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${startDateStr}T00:00:00Z`);
  const end = new Date(`${endDateStr}T00:00:00Z`);

  while (current <= end) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, "0");
    const d = String(current.getUTCDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
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

    const url = new URL(req.url);
    const params = url.searchParams;

    const employeeId = (params.get("employeeId") || "").trim();
    const month = (params.get("month") || "").trim(); // YYYY-MM
    const year = (params.get("year") || "").trim(); // YYYY
    let startDate = (params.get("startDate") || "").trim();
    let endDate = (params.get("endDate") || "").trim();
    const singleDate = (params.get("date") || "").trim();
    const search = (params.get("search") || "").trim();

    // Today in Kolkata timezone
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    if (singleDate) {
      startDate = singleDate;
      endDate = singleDate;
    } else if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [yearNum, monthNum] = month.split("-").map(Number);
      startDate = `${month}-01`;
      const lastDay = new Date(yearNum, monthNum, 0).getDate();
      endDate = `${month}-${String(lastDay).padStart(2, "0")}`;
    } else if (year && /^\d{4}$/.test(year)) {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    } else {
      if (!startDate) {
        const [curYear, curMonth] = todayStr.split("-").slice(0, 2);
        startDate = `${curYear}-${curMonth}-01`;
      }
      if (!endDate) {
        const [yearNum, monthNum] = startDate.split("-").map(Number);
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        endDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      }
    }

    // Ensure valid chronological range
    if (startDate > endDate) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    const isAdmin = Number(user.user_role) === 1;

    // Determine target employees
    const employeeFilter: Record<string, unknown> = {
      user_role: 2,
    };

    if (isAdmin) {
      employeeFilter.created_by = user._id;
    } else {
      // Non-admin can only see their own attendance
      employeeFilter._id = user._id;
    }

    if (employeeId) {
      if (!isAdmin && String(user._id) !== String(employeeId)) {
        return NextResponse.json(
          { success: false, message: "Unauthorized access to employee record." },
          { status: 403 }
        );
      }
      employeeFilter._id = employeeId;
    } else if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      employeeFilter.$or = [
        { full_name: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
        { designation: { $regex: escaped, $options: "i" } },
      ];
    }

    const employees = await User.find(employeeFilter)
      .select("_id qd_id full_name email phone_number designation role_id group workMode profile_picture status createdAt")
      .populate("role_id", "name short_desc")
      .sort({ full_name: 1 })
      .lean<any[]>();

    if (!employees.length) {
      return NextResponse.json({
        success: true,
        data: {
          startDate,
          endDate,
          today: todayStr,
          employees: [],
        },
      });
    }

    const employeeIds = employees.map((e) => e._id);

    // Fetch projects to map assigned project names
    const projects = await Project.find({
      $or: [
        { project_users: { $in: employeeIds } },
        { project_leader: { $in: employeeIds } },
      ],
    })
      .select("project_name project_users project_leader")
      .lean<any[]>();

    const projectsByEmpId = new Map<string, string[]>();
    for (const prj of projects) {
      const assigned = Array.isArray(prj.project_users) ? prj.project_users : [];
      if (prj.project_leader) assigned.push(prj.project_leader);

      for (const uId of assigned) {
        const strId = String(uId?._id || uId);
        if (!projectsByEmpId.has(strId)) {
          projectsByEmpId.set(strId, []);
        }
        const list = projectsByEmpId.get(strId)!;
        if (!list.includes(prj.project_name)) {
          list.push(prj.project_name);
        }
      }
    }

    // Fetch attendance records in date range
    const attendanceRecords = await Attendance.find({
      user_id: { $in: employeeIds },
      attendance_date: { $gte: startDate, $lte: endDate },
    }).lean<any[]>();

    // Map by `${userId}:${attendance_date}`
    const attendanceMap = new Map<string, any>();
    for (const record of attendanceRecords) {
      const key = `${String(record.user_id)}:${record.attendance_date}`;
      attendanceMap.set(key, record);
    }

    // Fetch organization settings to get configured weekly off days (default Sunday = [0]) and Saturday rules
    let weeklyOffDays: number[] = [0];
    let saturdayOffRule: "none" | "every" | "2nd_4th" | "alternate" = "none";
    try {
      const ownerId = isAdmin ? user._id : user.created_by || user._id;
      const settingsDoc = await Settings.findOne({
        $or: [{ owner_user_id: ownerId }, { _id: user.settings_id }],
        status: 1,
      }).select("weeklyOffDays saturdayOffRule").lean<any>();

      if (settingsDoc && Array.isArray(settingsDoc.weeklyOffDays) && settingsDoc.weeklyOffDays.length > 0) {
        weeklyOffDays = settingsDoc.weeklyOffDays.map(Number);
      }
      if (settingsDoc?.saturdayOffRule && ["none", "every", "2nd_4th", "alternate"].includes(settingsDoc.saturdayOffRule)) {
        saturdayOffRule = settingsDoc.saturdayOffRule;
      }
    } catch (e) {
      console.error("Error fetching weeklyOffDays in attendance report:", e);
    }

    const allDatesInRange = getDaysBetween(startDate, endDate);
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const shortDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const formattedEmployees = employees.map((emp, empIndex) => {
      const empIdStr = String(emp._id);
      const assignedProjects = projectsByEmpId.get(empIdStr) || [];
      const empNo = emp.qd_id ? String(emp.qd_id) : `TIS${String(empIndex + 1).padStart(3, "0")}`;

      let presentCount = 0;
      let absentCount = 0;
      let weekendCount = 0;
      let totalMinutes = 0;

      const dailyRecords = allDatesInRange.map((dateStr) => {
        const key = `${empIdStr}:${dateStr}`;
        const record = attendanceMap.get(key);

        const dObj = new Date(`${dateStr}T00:00:00Z`);
        const dayIdx = dObj.getUTCDay();
        const dayOfMonth = dObj.getUTCDate();
        const isPastOrToday = dateStr <= todayStr;

        let isWeeklyOff = weeklyOffDays.includes(dayIdx);
        let weekOffLabel = "";

        if (dayIdx === 6) {
          const satIndex = Math.ceil(dayOfMonth / 7);
          if (saturdayOffRule === "every") {
            isWeeklyOff = true;
            weekOffLabel = "Saturday";
          } else if (saturdayOffRule === "2nd_4th") {
            isWeeklyOff = satIndex === 2 || satIndex === 4;
            weekOffLabel = satIndex === 2 ? "2nd Sat" : satIndex === 4 ? "4th Sat" : "";
          } else if (saturdayOffRule === "alternate") {
            isWeeklyOff = satIndex === 1 || satIndex === 3 || satIndex === 5;
            weekOffLabel = satIndex === 1 ? "1st Sat" : satIndex === 3 ? "3rd Sat" : satIndex === 5 ? "5th Sat" : "";
          } else {
            isWeeklyOff = weeklyOffDays.includes(6);
            weekOffLabel = isWeeklyOff ? "Saturday" : "";
          }
        } else if (isWeeklyOff) {
          weekOffLabel = dayNames[dayIdx];
        }

        let status: "Present" | "Absent" | "Weekend" | "Upcoming" = "Absent";
        let durationMins = 0;
        let punchInStr: string | null = null;
        let punchOutStr: string | null = null;

        if (record && record.punch_in_on) {
          status = "Present";
          presentCount++;

          punchInStr = formatTime(record.punch_in_on);
          punchOutStr = formatTime(record.punch_out_on);

          if (record.punch_in_on && record.punch_out_on) {
            const startMs = new Date(record.punch_in_on).getTime();
            const endMs = new Date(record.punch_out_on).getTime();
            if (endMs > startMs) {
              durationMins = Math.round((endMs - startMs) / 60000);
              totalMinutes += durationMins;
            }
          }
        } else if (!isPastOrToday) {
          status = "Upcoming";
        } else if (isWeeklyOff) {
          status = "Weekend";
          weekendCount++;
        } else {
          status = "Absent";
          absentCount++;
        }

        const hours = Math.floor(durationMins / 60);
        const mins = durationMins % 60;
        const formattedDuration = durationMins > 0 ? `${hours}h ${mins}m` : status === "Present" ? "In Progress" : "--";

        return {
          date: dateStr,
          day: shortDayNames[dayIdx],
          fullDay: dayNames[dayIdx],
          isWeekend: isWeeklyOff,
          weekOffLabel,
          status,
          punchIn: punchInStr,
          punchOut: punchOutStr,
          punchOutSource: record?.punch_out_source || null,
          durationMinutes: durationMins,
          formattedDuration,
          punchInIp: record?.punch_in_ip || null,
          punchOutIp: record?.punch_out_ip || null,
          punchInReason: record?.punch_in_reason || null,
          punchOutReason: record?.punch_out_reason || null,
        };
      });

      const totalHours = Math.floor(totalMinutes / 60);
      const remainingMins = totalMinutes % 60;
      const avgMinutes = presentCount > 0 ? Math.round(totalMinutes / presentCount) : 0;
      const avgHours = Math.floor(avgMinutes / 60);
      const avgMins = avgMinutes % 60;

      return {
        _id: empIdStr,
        emp_no: empNo,
        qd_id: emp.qd_id || null,
        full_name: emp.full_name || "Employee",
        email: emp.email || "--",
        phone_number: emp.phone_number ? String(emp.phone_number) : "--",
        designation: emp.designation || (emp.role_id?.name ? String(emp.role_id.name) : "Employee"),
        role: emp.role_id?.name || "Employee",
        workMode: emp.workMode || "Hybrid",
        group: emp.group || "--",
        project: assignedProjects.join(", ") || "No Project",
        profile_picture: emp.profile_picture || null,
        status: emp.status !== false ? "Active" : "Inactive",
        createdAt: emp.createdAt,
        summary: {
          totalDays: allDatesInRange.length,
          presentDays: presentCount,
          absentDays: absentCount,
          weekendDays: weekendCount,
          totalWorkingMinutes: totalMinutes,
          formattedTotalHours: `${totalHours}h ${remainingMins}m`,
          averageDailyMinutes: avgMinutes,
          formattedAverageHours: `${avgHours}h ${avgMins}m`,
        },
        records: dailyRecords,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        startDate,
        endDate,
        today: todayStr,
        weeklyOffDays,
        saturdayOffRule,
        totalEmployees: formattedEmployees.length,
        employees: formattedEmployees,
      },
    });
  } catch (error: any) {
    console.error("Error in attendance report API:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load attendance report." },
      { status: 500 }
    );
  }
}
