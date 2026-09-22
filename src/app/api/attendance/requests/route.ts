import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import AttendanceRequest from "@/models/AttendanceRequest";
import User from "@/models/User";
import { currentUser } from "@/lib/auth";

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
        { status: 401 }
      );
    }

    if (Number(user.user_role) !== 1) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only admins can view attendance requests.",
        },
        { status: 403 }
      );
    }

    const myEmployees = await User.find({
      created_by: user._id,
    }).distinct("_id");

    const requests =
      await AttendanceRequest.find({
        $or: [
          { admin_id: user._id },
          { employee_id: { $in: myEmployees } },
        ],
      })
        .populate(
          "employee_id",
          "full_name email designation"
        )
        .populate(
          "reviewed_by",
          "full_name email"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    return NextResponse.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error(
      "GET /api/attendance/requests error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load attendance requests.",
      },
      { status: 500 }
    );
  }
}