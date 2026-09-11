import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import sendOtp from "@/utils/otp";

export async function POST(req: Request) {
    try {
        await dbConnect();

        const { email } = await req.json();

        if (!email) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Email is required",
                },
                { status: 400 }
            );
        }

        const normalizedEmail = email
            .toLowerCase()
            .trim();

        const user = await User.findOne({
            email: normalizedEmail,
        });

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    message: "User not found",
                },
                { status: 404 }
            );
        }

        if (user.isVerify) {
            return NextResponse.json(
                {
                    success: false,
                    message: "User already verified",
                },
                { status: 409 }
            );
        }

        const otpSent = await sendOtp(
            normalizedEmail
        );

        if (!otpSent) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Failed to generate OTP",
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "OTP resent successfully",
        });

    } catch (error) {
        console.error("Resend OTP Error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
            },
            { status: 500 }
        );
    }
}