import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Otp from "@/models/otp";

export async function POST(req: Request) {
    try {
        await dbConnect();

        const { email, otp } = await req.json();

        if (!email || !otp) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Email and OTP are required",
                },
                { status: 400 }
            );
        }

        const normalizedEmail = email
            .toLowerCase()
            .trim();

        const getOtp = await Otp.findOne({
            email: normalizedEmail,
        });

        if (!getOtp) {
            return NextResponse.json(
                {
                    success: false,
                    message: "OTP not generated",
                },
                { status: 404 }
            );
        }

        if (getOtp.expires_at < new Date()) {
            return NextResponse.json(
                {
                    success: false,
                    message: "OTP expired",
                },
                { status: 409 }
            );
        }

        if (Number(getOtp.otp) !== Number(otp)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "OTP not matched",
                },
                { status: 409 }
            );
        }

        const user = await User.findOneAndUpdate(
            {
                email: normalizedEmail,
                isVerify: false,
            },
            {
                $set: {
                    isVerify: true,
                },
            },
            {
                new: true,
            }
        );

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "User not found or already verified",
                },
                { status: 404 }
            );
        }

        // OTP delete after successful verification
        await Otp.deleteOne({
            _id: getOtp._id,
        });

        return NextResponse.json({
            success: true,
            message: "OTP verified successfully",
        });

    } catch (error) {
        console.error("Verify OTP Error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
            },
            { status: 500 }
        );
    }
}