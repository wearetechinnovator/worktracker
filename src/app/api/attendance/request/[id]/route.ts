import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import AttendanceRequest from "@/models/AttendanceRequest";
import Attendance from "@/models/Attendance";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { currentUser } from "@/lib/auth";

export async function PATCH(
  req: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
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

    if (Number(user.user_role) !== 1) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only admins can review attendance requests.",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const body =
      await req.json().catch(() => ({}));

    const decision = body.action;

    const rejectionReason =
      String(
        body.rejectionReason || ""
      ).trim();

    if (
      decision !== "approve" &&
      decision !== "reject"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Action must be approve or reject.",
        },
        { status: 400 }
      );
    }

    let request =
      await AttendanceRequest.findOne({
        _id: id,
        admin_id: user._id,
        status: "Pending",
      });

    if (!request) {
      const candidate = await AttendanceRequest.findOne({
        _id: id,
        status: "Pending",
      });

      if (candidate) {
        const emp = await User.findById(candidate.employee_id);
        if (emp && (!emp.created_by || String(emp.created_by) === String(user._id))) {
          request = candidate;
        }
      }
    }

    if (!request) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Pending attendance request not found.",
        },
        { status: 404 }
      );
    }

    /* =====================================================
       REJECT
    ===================================================== */

    if (decision === "reject") {
      if (!rejectionReason) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Rejection reason is required.",
          },
          { status: 400 }
        );
      }

      request.status = "Rejected";
      request.reviewed_by = user._id;
      request.reviewed_at = new Date();
      request.rejection_reason =
        rejectionReason;

      await request.save();

      try {
        await Notification.create({
          userId: request.employee_id,
          title: "Attendance Request Rejected",
          message: `Your ${request.request_type === "punchIn" ? "Punch In" : "Punch Out"} request for ${request.attendance_date} was rejected. Reason: ${rejectionReason}`,
          type: "punch",
          link: "/user/punch",
          read: false,
        });
      } catch (notifErr) {
        console.error("Failed to notify employee of rejection:", notifErr);
      }

      return NextResponse.json({
        success: true,
        message:
          "Attendance request rejected.",
        data: request,
      });
    }

    /* =====================================================
       APPROVE
    ===================================================== */

    const employee =
      await User.findById(
        request.employee_id
      );

    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Employee not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Security:
     * Employee must belong to this admin if created_by is assigned.
     */
    if (
      employee.created_by &&
      String(employee.created_by) !==
      String(user._id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This employee does not belong to you.",
        },
        { status: 403 }
      );
    }

    /* =====================================================
       APPROVE PUNCH IN
    ===================================================== */

    if (request.request_type === "punchIn") {
      const existingOpen =
        await Attendance.findOne({
          user_id: employee._id,
          punch_in_on: {
            $ne: null,
          },
          punch_out_on: null,
        });

      if (existingOpen) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Employee is already punched in.",
          },
          { status: 400 }
        );
      }

      const existingToday =
        await Attendance.findOne({
          user_id: employee._id,
          attendance_date:
            request.attendance_date,
        });

      const attendance =
        existingToday ||
        new Attendance();

      attendance.user_id =
        employee._id;

      attendance.attendance_date =
        request.attendance_date;

      attendance.punch_in_on =
        request.requested_punch_at;

      attendance.punch_out_on =
        null;

      attendance.allow_punch_in_by =
        user._id;

      attendance.allow_punch_out_by =
        null;

      attendance.punch_in_ip =
        request.ip;

      attendance.punch_in_geo =
        request.geo || [];

      attendance.punch_in_browser =
        request.browser;

      attendance.punch_in_systemid =
        request.systemid;

      attendance.punch_in_reason =
        request.reason;

      attendance.punch_out_ip =
        null;

      attendance.punch_out_geo = [];

      attendance.punch_out_browser =
        null;

      attendance.punch_out_systemid =
        null;

      attendance.punch_out_reason =
        null;

      await attendance.save();

      request.status = "Approved";
      request.reviewed_by = user._id;
      request.reviewed_at = new Date();

      await request.save();

      try {
        await Notification.create({
          userId: employee._id,
          title: "Attendance Request Approved",
          message: `Your Punch In request for ${request.attendance_date} has been approved. You are now punched in.`,
          type: "punch",
          link: "/user/punch",
          read: false,
        });
      } catch (notifErr) {
        console.error("Failed to notify employee of approval:", notifErr);
      }

      return NextResponse.json({
        success: true,
        message:
          "Punch In request approved.",
        attendance,
        request,
      });
    }

    /* =====================================================
       APPROVE PUNCH OUT
    ===================================================== */

    if (request.request_type === "punchOut") {
      const openAttendance =
        await Attendance.findOne({
          user_id: employee._id,
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
            message:
              "Employee has no active punch-in session.",
          },
          { status: 400 }
        );
      }

      /*
       * Update SAME attendance record.
       */
      openAttendance.punch_out_on =
        request.requested_punch_at;

      openAttendance.allow_punch_out_by =
        user._id;

      openAttendance.punch_out_ip =
        request.ip;

      openAttendance.punch_out_geo =
        request.geo || [];

      openAttendance.punch_out_browser =
        request.browser;

      openAttendance.punch_out_systemid =
        request.systemid;

      openAttendance.punch_out_reason =
        request.reason;

      // Ensure attendance_date is set (required in Attendance schema)
      if (!openAttendance.attendance_date) {
        openAttendance.attendance_date = request.attendance_date;
      }

      await openAttendance.save();

      request.status = "Approved";
      request.reviewed_by = user._id;
      request.reviewed_at = new Date();

      await request.save();

      try {
        await Notification.create({
          userId: employee._id,
          title: "Attendance Request Approved",
          message: `Your Punch Out request for ${request.attendance_date} has been approved. Your shift attendance is now completed.`,
          type: "punch",
          link: "/user/punch",
          read: false,
        });
      } catch (notifErr) {
        console.error("Failed to notify employee of punch out approval:", notifErr);
      }

      return NextResponse.json({
        success: true,
        message:
          "Punch Out request approved.",
        attendance:
          openAttendance,
        request,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Unsupported request type.",
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error(
      "PATCH /api/attendance/request/[id] error:",
      error
    );

    if (error?.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Attendance record already exists.",
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
            : "Failed to process attendance request.",
      },
      { status: 500 }
    );
  }
}