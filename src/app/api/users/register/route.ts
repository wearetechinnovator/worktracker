import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Settings from "@/models/Settings";
import sendOtp from "@/utils/otp";

export async function POST(req: Request) {
  let user: any = null;
  let settings: any = null;

  try {
    await dbConnect();

    const { full_name, email, password } = await req.json();

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!full_name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Full name, email and password are required",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedName = String(full_name).trim();

    if (!normalizedName) {
      return NextResponse.json(
        {
          success: false,
          message: "Full name is required",
        },
        { status: 400 }
      );
    }

    if (!normalizedEmail) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       CHECK EXISTING USER
    ===================================================== */

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User with this email is already registered.",
        },
        { status: 409 }
      );
    }

    /* =====================================================
       HASH PASSWORD
    ===================================================== */

    const hashedPassword = await bcrypt.hash(password, 10);

    /* =====================================================
       CREATE ADMIN USER
    ===================================================== */

    user = await User.create({
      full_name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,

      // 1 = Admin
      user_role: 1,

      isVerify: false,
      status: true,

      created_by: null,
      modified_by: null,

      settings_id: null,
    });

    /* =====================================================
       CREATE SETTINGS FOR THIS ADMIN
    ===================================================== */

    settings = await Settings.create({
      owner_user_id: user._id,

      /* =================================================
         PUNCH IN
      ================================================= */

      punchInGeoRequired: false,
      punchInIpRequired: false,
      punchInBrowserRequired: false,
      punchInSystemIdRequired: false,

      /* =================================================
         PUNCH OUT
      ================================================= */

      punchOutGeoRequired: false,
      punchOutIpRequired: false,
      punchOutBrowserRequired: false,
      punchOutSystemIdRequired: false,

      /* =================================================
         PUNCH IN TIME
      ================================================= */

      punchInStartTime: null,
      punchInEndTime: null,

      /* =================================================
         PUNCH OUT TIME
      ================================================= */

      punchOutStartTime: null,
      punchOutEndTime: null,

      /* =================================================
         TASK SETTINGS
      ================================================= */

      taskIdPrefix: "QT",
      nextTaskNumber: 1,

      /* =================================================
         AUDIT
      ================================================= */

      created_by: user._id,
      modified_by: null,

      created_on: new Date(),
      modified_on: null,

      status: 1,
    });

    /* =====================================================
       LINK SETTINGS TO ADMIN
    ===================================================== */

    user.settings_id = settings._id;

    await user.save();

    /* =====================================================
       SEND OTP
    ===================================================== */

    const otpSent = await sendOtp(normalizedEmail);

    /* =====================================================
       ROLLBACK IF OTP FAILED
    ===================================================== */

    if (!otpSent) {
      throw new Error("Failed to send OTP");
    }

    /* =====================================================
       SUCCESS
    ===================================================== */

    return NextResponse.json(
      {
        success: true,
        message: "User created. OTP sent successfully.",
        data: {
          email: normalizedEmail,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register API Error:", error);

    /* =====================================================
       ROLLBACK
       If anything fails after User/Settings creation,
       remove the partially created records.
    ===================================================== */

    try {
      if (settings?._id) {
        await Settings.deleteOne({
          _id: settings._id,
        });
      }

      if (user?._id) {
        await User.deleteOne({
          _id: user._id,
        });
      }
    } catch (rollbackError) {
      console.error(
        "Register rollback error:",
        rollbackError
      );
    }

    /* =====================================================
       ERROR RESPONSE
    ===================================================== */

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}