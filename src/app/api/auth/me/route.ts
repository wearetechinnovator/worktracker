import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

export async function GET() {
  try {
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

    const userType =
      user.user_role === 1
        ? "admin"
        : user.user_role === 2
          ? "employee"
          : "employee";

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id.toString(),

        // Frontend-friendly name
        name: user.full_name,
        full_name: user.full_name,

        email: user.email,
        phone_number: user.phone_number,

        profile_picture: user.profile_picture,
        designation: user.designation,
        group: user.group,

        // Original DB value
        user_role: user.user_role,

        // Frontend uses this
        userType,

        isVerify: user.isVerify,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("GET /api/auth/me Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch current user",
      },
      { status: 500 }
    );
  }
}