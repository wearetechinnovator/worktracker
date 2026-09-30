import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import AttendanceRequest from "@/models/AttendanceRequest";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { currentUser } from "@/lib/auth";
import { sendPunchApprovedMail } from "@/lib/mailer";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
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

    if (Number(user.user_role) !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Only admins can review attendance requests.",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const decision = body.action;
    const rejectionReason = String(body.rejectionReason || "").trim();

    if (decision !== "approve" && decision !== "reject") {
      return NextResponse.json(
        { success: false, message: "Action must be approve or reject." },
        { status: 400 }
      );
    }

    const request = await AttendanceRequest.findOne({
      _id: id,
      status: "Pending",
    });

    if (!request) {
      return NextResponse.json(
        { success: false, message: "Pending attendance request not found." },
        { status: 404 }
      );
    }

    const employee = await User.findById(request.employee_id);

    if (!employee) {
      return NextResponse.json(
        { success: false, message: "Employee not found." },
        { status: 404 }
      );
    }

    if (
      Number(employee.user_role) !== 2 ||
      (employee.created_by && String(employee.created_by) !== String(user._id))
    ) {
      return NextResponse.json(
        { success: false, message: "This employee does not belong to you." },
        { status: 403 }
      );
    }

    if (decision === "reject") {
      if (!rejectionReason) {
        return NextResponse.json(
          { success: false, message: "Rejection reason is required." },
          { status: 400 }
        );
      }

      request.status = "Rejected";
      request.reviewed_by = user._id;
      request.reviewed_at = new Date();
      request.rejection_reason = rejectionReason;
      request.used_at = null;

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
        message: "Attendance request rejected.",
        data: request,
      });
    }

    request.status = "Approved";
    request.reviewed_by = user._id;
    request.reviewed_at = new Date();
    request.used_at = null;

    await request.save();

    try {
      await Notification.create({
        userId: employee._id,
        title: "Attendance Request Approved",
        message: `Your ${request.request_type === "punchIn" ? "Punch In" : "Punch Out"} request for ${request.attendance_date} has been approved. Please click the ${request.request_type === "punchIn" ? "Punch In" : "Punch Out"} button to complete the action.`,
        type: "punch",
        link: "/user/punch",
        read: false,
      });
    } catch (notifErr) {
      console.error("Failed to notify employee of approval:", notifErr);
    }

    if (employee.email) {
      sendPunchApprovedMail({
        to: employee.email,
        employeeName: employee.full_name || employee.name || "Employee",
        requestType: request.request_type,
        date: request.attendance_date,
        approvedByName: user.full_name || user.name || "Admin",
        approvedAt: request.reviewed_at,
      }).catch((mailErr) => {
        console.error("Failed to send punch approval email to employee:", mailErr);
      });
    }

    return NextResponse.json({
      success: true,
      message:
        "Attendance request approved. The employee must click the Punch button to complete the action.",
      data: request,
    });
  } catch (error: any) {
    console.error("PATCH /api/attendance/request/[id] error:", error);

    if (error?.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "An attendance allowance already exists for this action.",
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
