import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import Attendance from "@/models/Attendance";
import AttendanceRequest from "@/models/AttendanceRequest";
import Settings from "@/models/Settings";
import User from "@/models/User";
import { currentUser } from "@/lib/auth";

/* =========================================================
   HELPERS
========================================================= */

/**
 * Get client IP address.
 */
function getClientIp(req: Request): string {
  const forwardedFor =
    req.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor
      .split(",")[0]
      .trim();
  }

  return (
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

/**
 * Get browser / user agent.
 */
function getClientBrowser(
  req: Request
): string {
  return (
    req.headers.get("user-agent") ||
    "Unknown Browser"
  );
}

/**
 * Get attendance date in IST.
 *
 * Example:
 *
 * 2026-09-22
 */
function getAttendanceDate(
  date: Date = new Date()
): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(date);
}

/**
 * Get current IST time.
 *
 * Example:
 *
 * 10:30
 */
function getCurrentISTTime(
  date: Date = new Date()
): string {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  ).format(date);
}

/**
 * Convert HH:mm to minutes.
 */
function timeToMinutes(
  time: string | null | undefined
): number | null {
  if (!time) {
    return null;
  }

  const match =
    /^(\d{2}):(\d{2})$/.exec(time);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

/**
 * Check whether current time is inside
 * configured attendance window.
 *
 * Both null:
 *     No restriction.
 *
 * One null:
 *     No restriction.
 *
 * Normal:
 *     10:00 -> 10:30
 *
 * Overnight:
 *     22:00 -> 02:00
 */
function isWithinTimeWindow(
  currentTime: string,
  startTime:
    | string
    | null
    | undefined,
  endTime:
    | string
    | null
    | undefined
): boolean {
  /*
   * No restriction.
   */
  if (!startTime && !endTime) {
    return true;
  }

  /*
   * Partial configuration.
   *
   * Treat as unrestricted.
   */
  if (!startTime || !endTime) {
    return true;
  }

  const current =
    timeToMinutes(currentTime);

  const start =
    timeToMinutes(startTime);

  const end =
    timeToMinutes(endTime);

  /*
   * Invalid configuration.
   */
  if (
    current === null ||
    start === null ||
    end === null
  ) {
    return true;
  }

  /*
   * Normal time window.
   *
   * Example:
   * 10:00 -> 18:00
   */
  if (start <= end) {
    return (
      current >= start &&
      current <= end
    );
  }

  /*
   * Overnight time window.
   *
   * Example:
   * 22:00 -> 02:00
   */
  return (
    current >= start ||
    current <= end
  );
}

/* =========================================================
   ATTENDANCE HELPERS
========================================================= */

/**
 * Find currently open attendance.
 *
 * IMPORTANT:
 *
 * We do NOT filter by attendance_date here.
 *
 * This is required for overnight shifts.
 *
 * Example:
 *
 * Sep 22 11:50 PM
 * Punch In
 *
 * Sep 23 12:10 AM
 * Punch Out
 *
 * The open Sep 22 record must be found.
 */
async function getOpenAttendance(
  userId: any
) {
  return Attendance.findOne({
    user_id: userId,

    punch_in_on: {
      $ne: null,
    },

    punch_out_on: null,
  }).sort({
    punch_in_on: -1,
  });
}

/**
 * Make sure an old attendance document
 * has attendance_date.
 *
 * This handles records created before
 * attendance_date was added to the schema.
 *
 * IMPORTANT:
 *
 * We use punch_in_on, NOT current date.
 *
 * This keeps overnight attendance correct.
 */
function ensureAttendanceDate(
  attendance: any,
  fallbackDate: Date = new Date()
): string {
  if (
    attendance.attendance_date
  ) {
    return String(
      attendance.attendance_date
    );
  }

  const sourceDate =
    attendance.punch_in_on
      ? new Date(
        attendance.punch_in_on
      )
      : fallbackDate;

  const attendanceDate =
    getAttendanceDate(
      sourceDate
    );

  attendance.attendance_date =
    attendanceDate;

  return attendanceDate;
}

/**
 * Get settings belonging to user.
 *
 * Admin:
 *   Settings.owner_user_id = admin._id
 *
 * Employee:
 *   Settings.owner_user_id = employee.created_by
 */
async function getUserSettings(
  user: any
) {
  const ownerId =
    Number(user.user_role) === 1
      ? user._id
      : user.created_by;

  if (!ownerId) {
    const fallbackAdmin = await User.findOne({ user_role: 1, status: true });
    if (!fallbackAdmin) return null;
    return Settings.findOne({ owner_user_id: fallbackAdmin._id, status: 1 });
  }

  if (user.settings_id) {
    const directSettings = await Settings.findOne({
      _id: user.settings_id,
      owner_user_id: ownerId,
      status: 1,
    });
    if (directSettings) return directSettings;
  }

  return Settings.findOne({
    owner_user_id: ownerId,
    status: 1,
  });
}

/* =========================================================
   REQUIREMENT VALIDATION
========================================================= */

function validatePunchRequirements(
  settings: any,

  action:
    | "punchIn"
    | "punchOut",

  data: {
    geo: any[];
    ip: string;
    browser: string;
    systemId: string | null;
  }
): string[] {
  const {
    geo,
    ip,
    browser,
    systemId,
  } = data;

  const prefix =
    action === "punchIn"
      ? "punchIn"
      : "punchOut";

  const errors: string[] = [];

  /*
   * GEO
   */
  if (
    settings?.[
    `${prefix}GeoRequired`
    ] &&
    (!Array.isArray(geo) ||
      geo.length === 0)
  ) {
    errors.push(
      "Location is required."
    );
  }

  /*
   * IP
   */
  if (
    settings?.[
    `${prefix}IpRequired`
    ] &&
    !ip
  ) {
    errors.push(
      "IP address is required."
    );
  }

  /*
   * Browser
   */
  if (
    settings?.[
    `${prefix}BrowserRequired`
    ] &&
    (!browser ||
      browser ===
      "Unknown Browser")
  ) {
    errors.push(
      "Browser information is required."
    );
  }

  /*
   * System ID
   */
  if (
    settings?.[
    `${prefix}SystemIdRequired`
    ] &&
    !systemId
  ) {
    errors.push(
      "System ID is required."
    );
  }

  return errors;
}

/* =========================================================
   GET
========================================================= */

export async function GET() {
  try {
    await dbConnect();

    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * Find currently active attendance.
     *
     * This also supports overnight shifts.
     */
    const activeAttendance = await getOpenAttendance(
      user._id
    );

    const today = getAttendanceDate();

    /*
     * Check for any pending attendance request for today.
     */
    const pendingRequest =
      await AttendanceRequest.findOne({
        employee_id: user._id,
        attendance_date: today,
        status: "Pending",
      })
        .sort({ createdAt: -1 })
        .lean();

    /*
     * Check for the latest rejected attendance request for today.
     *
     * IMPORTANT:
     * Keep this separate from pendingRequest because a rejected
     * request must NOT disable Punch In / Punch Out.
     */
    const rejectedRequest =
      await AttendanceRequest.findOne({
        employee_id: user._id,
        status: "Rejected",
      })
        .sort({
          reviewed_at: -1,
          createdAt: -1,
        })
        .lean();

    if (activeAttendance) {
      /*
       * Old record safety.
       *
       * If attendance_date is missing,
       * repair it before returning it.
       */
      if (!activeAttendance.attendance_date) {
        ensureAttendanceDate(activeAttendance);

        try {
          await activeAttendance.save();
        } catch (error) {
          console.error(
            "Failed to repair attendance_date:",
            error
          );
        }
      }

      return NextResponse.json({
        success: true,

        isPunchedIn: true,

        canPunchIn: false,

        canPunchOut:
          !pendingRequest ||
          pendingRequest.request_type !== "punchOut",

        attendance: activeAttendance,

        pendingRequest:
          pendingRequest || null,

        rejectedRequest:
          rejectedRequest || null,

        viewMode: false,
      });
    }

    /*
     * Find today's attendance.
     */
    const todayAttendance =
      await Attendance.findOne({
        user_id: user._id,

        attendance_date: today,
      }).sort({
        punch_in_on: -1,
      });

    const isAdmin =
      Number(user.user_role) === 1;

    return NextResponse.json({
      success: true,

      isPunchedIn: false,

      canPunchIn:
        !pendingRequest ||
        pendingRequest.request_type !== "punchIn",

      canPunchOut: false,

      attendance:
        todayAttendance || null,

      pendingRequest:
        pendingRequest || null,

      rejectedRequest:
        rejectedRequest || null,

      viewMode: !isAdmin,
    });
  } catch (error) {
    console.error(
      "GET /api/attendance/punch error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  req: Request
) {
  try {
    await dbConnect();

    const user =
      await currentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Authentication required",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * Parse request body.
     */
    const body =
      await req
        .json()
        .catch(() => ({}));

    const action =
      body?.action;

    /*
     * Validate action.
     */
    if (
      action !== "punchIn" &&
      action !== "punchOut"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid action. Use 'punchIn' or 'punchOut'.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Request data.
     */
    const {
      geo = [],
      reason = "",
      systemId = null,
      targetUserId = null,
    } = body;

    /*
     * Client information.
     */
    const ip =
      getClientIp(req);

    const browser =
      getClientBrowser(req);

    /*
     * Current user's role.
     */
    const isAdmin =
      Number(user.user_role) === 1;

    /* =====================================================
       TARGET USER
    ===================================================== */

    /*
     * Employee:
     *
     *   Can only punch himself.
     *
     * Admin:
     *
     *   Can punch for his own employees.
     */
    const effectiveUserId =
      isAdmin &&
        targetUserId
        ? targetUserId
        : user._id;

    let targetUser =
      user;

    /*
     * Admin punching on behalf
     * of an employee.
     */
    if (
      String(effectiveUserId) !==
      String(user._id)
    ) {
      targetUser =
        await User.findById(
          effectiveUserId
        );

      if (!targetUser) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Target user not found.",
          },
          {
            status: 404,
          }
        );
      }

      /*
       * Target must be employee.
       */
      if (
        Number(
          targetUser.user_role
        ) !== 2
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Admin can only punch for employees.",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * Admin can only manage
       * his own employees.
       */
      if (
        String(
          targetUser.created_by
        ) !==
        String(user._id)
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "You cannot manage this employee.",
          },
          {
            status: 403,
          }
        );
      }
    }

    /* =====================================================
       SETTINGS
    ===================================================== */

    const settings =
      await getUserSettings(
        targetUser
      );

    if (!settings) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Attendance settings are not configured.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       TIME
    ===================================================== */

    const now =
      new Date();

    /*
     * Attendance date ALWAYS comes
     * from IST.
     */
    const attendanceDate =
      getAttendanceDate(
        now
      );

    /*
     * Current IST time.
     */
    const currentTime =
      getCurrentISTTime(
        now
      );

    /*
     * Safety check.
     */
    if (
      !attendanceDate
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Unable to determine attendance date.",
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       PUNCH IN
    ===================================================== */

    if (
      action === "punchIn"
    ) {
      /*
       * ---------------------------------------------------
       * Check active/open attendance.
       * ---------------------------------------------------
       */

      const existingOpen =
        await getOpenAttendance(
          effectiveUserId
        );

      if (existingOpen) {
        /*
         * Repair old record if necessary.
         */
        if (
          !existingOpen.attendance_date
        ) {
          ensureAttendanceDate(
            existingOpen,
            now
          );

          try {
            await existingOpen.save();
          } catch (error) {
            console.error(
              "Failed to repair open attendance:",
              error
            );
          }
        }

        return NextResponse.json(
          {
            success: false,

            message:
              "Already punched in. Please punch out first.",

            attendance:
              existingOpen,

            isPunchedIn: true,

            canPunchIn: false,

            canPunchOut: true,
          },
          {
            status: 400,
          }
        );
      }

      /*
       * ---------------------------------------------------
       * Find today's attendance.
       * ---------------------------------------------------
       */

      const existingToday =
        await Attendance.findOne({
          user_id:
            effectiveUserId,

          attendance_date:
            attendanceDate,
        });

      /*
       * ---------------------------------------------------
       * Completed attendance cannot
       * be reopened.
       * ---------------------------------------------------
       */

      if (
        existingToday &&
        existingToday.punch_in_on &&
        existingToday.punch_out_on
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "You have already punched out for today.",

            isPunchedIn: false,

            canPunchIn: false,

            canPunchOut: false,

            requiresRequest: true,

            requestType:
              "punchIn",

            isAlreadyPunchedOut: true,

            currentTime,

            punchInStartTime:
              settings?.punchInStartTime,

            punchInEndTime:
              settings?.punchInEndTime,
          },
          {
            status: 403,
          }
        );
      }

      /*
       * ---------------------------------------------------
       * Punch In time window.
       * ---------------------------------------------------
       */

      const punchInAllowed =
        isWithinTimeWindow(
          currentTime,

          settings.punchInStartTime,

          settings.punchInEndTime
        );

      if (!punchInAllowed) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Punch In window closed.",

            requiresRequest: true,

            requestType:
              "punchIn",

            currentTime,

            punchInStartTime:
              settings.punchInStartTime,

            punchInEndTime:
              settings.punchInEndTime,
          },
          {
            status: 403,
          }
        );
      }

      /*
       * ---------------------------------------------------
       * Metadata requirements.
       * ---------------------------------------------------
       */

      const requirementErrors =
        validatePunchRequirements(
          settings,

          "punchIn",

          {
            geo:
              Array.isArray(geo)
                ? geo
                : [],

            ip,

            browser,

            systemId,
          }
        );

      if (
        requirementErrors.length >
        0
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Punch In requirements are missing.",

            errors:
              requirementErrors,
          },
          {
            status: 400,
          }
        );
      }

      /*
       * ===================================================
       * CREATE NEW ATTENDANCE
       * ===================================================
       *
       * IMPORTANT:
       *
       * attendance_date is explicitly
       * included in Attendance.create().
       */

      const attendance =
        await Attendance.create({
          user_id:
            effectiveUserId,

          attendance_date:
            attendanceDate,

          punch_in_on:
            now,

          punch_out_on:
            null,

          allow_punch_in_by:
            user._id,

          allow_punch_out_by:
            null,

          punch_in_ip:
            ip,

          punch_out_ip:
            null,

          punch_in_geo:
            Array.isArray(geo)
              ? geo
              : [],

          punch_out_geo:
            [],

          punch_in_reason:
            String(
              reason || ""
            ).trim() ||
            "Regular shift punch in",

          punch_out_reason:
            null,

          punch_in_browser:
            browser,

          punch_out_browser:
            null,

          punch_in_systemid:
            systemId || null,

          punch_out_systemid:
            null,
        });

      /*
       * Debug information.
       */
      console.log(
        "PUNCH IN ATTENDANCE CREATED:",
        {
          id:
            attendance._id?.toString(),

          user_id:
            attendance.user_id?.toString(),

          attendance_date:
            attendance.attendance_date,

          punch_in_on:
            attendance.punch_in_on,
        }
      );

      return NextResponse.json({
        success: true,

        message:
          "Punched in successfully",

        isPunchedIn: true,

        canPunchIn: false,

        canPunchOut: true,

        attendance,

        viewMode: false,
      });
    }

    /* =====================================================
       PUNCH OUT
    ===================================================== */

    if (
      action === "punchOut"
    ) {
      /*
       * ---------------------------------------------------
       * Find currently open attendance.
       * ---------------------------------------------------
       *
       * We intentionally don't filter
       * by today's date.
       *
       * This supports overnight shifts.
       */

      const openAttendance =
        await getOpenAttendance(
          effectiveUserId
        );

      if (!openAttendance) {
        return NextResponse.json(
          {
            success: false,

            message:
              "No active punch-in session found.",

            isPunchedIn: false,

            canPunchIn: true,

            canPunchOut: false,
          },
          {
            status: 400,
          }
        );
      }

      /*
       * ===================================================
       * OLD RECORD FIX
       * ===================================================
       *
       * This is the important fix for
       * your current error.
       *
       * Old attendance records may not have
       * attendance_date because the field was
       * added later.
       *
       * We calculate it from punch_in_on.
       *
       * Example:
       *
       * punch in:
       * 2026-09-22 23:50
       *
       * punch out:
       * 2026-09-23 00:10
       *
       * attendance_date:
       * 2026-09-22
       */

      if (
        !openAttendance.attendance_date
      ) {
        const originalPunchInDate =
          openAttendance.punch_in_on
            ? new Date(
              openAttendance.punch_in_on
            )
            : now;

        openAttendance.attendance_date =
          getAttendanceDate(
            originalPunchInDate
          );

        console.log(
          "REPAIRED OLD ATTENDANCE DATE:",
          {
            attendanceId:
              openAttendance._id?.toString(),

            punchIn:
              openAttendance.punch_in_on,

            attendanceDate:
              openAttendance.attendance_date,
          }
        );
      }

      /*
       * ---------------------------------------------------
       * Punch Out time window.
       * ---------------------------------------------------
       */

      const punchOutAllowed =
        isWithinTimeWindow(
          currentTime,

          settings.punchOutStartTime,

          settings.punchOutEndTime
        );

      if (!punchOutAllowed) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Punch Out time window has passed or is not currently open.",

            requiresRequest: true,

            requestType:
              "punchOut",

            currentTime,

            punchOutStartTime:
              settings.punchOutStartTime,

            punchOutEndTime:
              settings.punchOutEndTime,
          },
          {
            status: 403,
          }
        );
      }

      /*
       * ---------------------------------------------------
       * Metadata requirements.
       * ---------------------------------------------------
       */

      const requirementErrors =
        validatePunchRequirements(
          settings,

          "punchOut",

          {
            geo:
              Array.isArray(geo)
                ? geo
                : [],

            ip,

            browser,

            systemId,
          }
        );

      if (
        requirementErrors.length >
        0
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Punch Out requirements are missing.",

            errors:
              requirementErrors,
          },
          {
            status: 400,
          }
        );
      }

      /*
       * ===================================================
       * UPDATE SAME ATTENDANCE
       * ===================================================
       */

      openAttendance.punch_out_on =
        now;

      openAttendance.allow_punch_out_by =
        user._id;

      openAttendance.punch_out_ip =
        ip;

      openAttendance.punch_out_browser =
        browser;

      openAttendance.punch_out_geo =
        Array.isArray(geo)
          ? geo
          : [];

      openAttendance.punch_out_reason =
        String(
          reason || ""
        ).trim() ||
        "Shift completion punch out";

      openAttendance.punch_out_systemid =
        systemId || null;

      /*
       * Save the SAME attendance record.
       *
       * attendance_date is guaranteed
       * to exist at this point.
       */
      await openAttendance.save();

      /*
       * Debug information.
       */
      console.log(
        "PUNCH OUT ATTENDANCE UPDATED:",
        {
          id:
            openAttendance._id?.toString(),

          user_id:
            openAttendance.user_id?.toString(),

          attendance_date:
            openAttendance.attendance_date,

          punch_in_on:
            openAttendance.punch_in_on,

          punch_out_on:
            openAttendance.punch_out_on,
        }
      );

      return NextResponse.json({
        success: true,

        message:
          "Punched out successfully",

        isPunchedIn: false,

        canPunchIn: true,

        canPunchOut: false,

        attendance:
          openAttendance,

        viewMode:
          !isAdmin,
      });
    }

    /*
     * Should never reach here.
     */
    return NextResponse.json(
      {
        success: false,

        message:
          "Invalid action.",
      },
      {
        status: 400,
      }
    );
  } catch (error: any) {
    console.error(
      "POST /api/attendance/punch error:",
      error
    );

    /*
     * =====================================================
     * DUPLICATE RECORD
     * =====================================================
     */

    if (
      error?.code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Attendance record already exists for today.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * =====================================================
     * MONGOOSE VALIDATION ERROR
     * =====================================================
     */

    if (
      error?.name ===
      "ValidationError"
    ) {
      const validationErrors =
        Object.keys(
          error.errors || {}
        ).map(
          (key) =>
            error.errors[key]
              ?.message ||
            key
        );

      return NextResponse.json(
        {
          success: false,

          message:
            `Attendance validation failed: ${validationErrors.join(
              ", "
            )
            }`,

          errors:
            validationErrors,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * GENERAL ERROR
     * =====================================================
     */

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}