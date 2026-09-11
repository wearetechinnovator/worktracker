import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Role from "@/models/Role";
import sendOtp from "@/utils/otp";

export async function POST(req: Request) {
    try {
        await dbConnect();

        const {
            full_name,
            email,
            password,
        } = await req.json();

        if (!full_name || !email || !password) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Full name, email and password are required",
                },
                { status: 400 }
            );
        }

        const normalizedEmail = email
            .toLowerCase()
            .trim();

        // Check existing user
        const existingUser = await User.findOne({
            email: normalizedEmail,
        });

        if (existingUser) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "User with this email is already registered.",
                },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(
            password,
            10
        );

        // Create user
        // isVerify automatically false
        const role_id = await Role.findOne({
            
        })

        const user = await User.create({
            full_name: full_name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            user_role: 1
        });

        // Generate OTP
        const otpSent = await sendOtp(
            normalizedEmail
        );

        if (!otpSent) {
            // OTP generate
            await User.deleteOne({
                _id: user._id,
            });

            return NextResponse.json(
                {
                    success: false,
                    message: "Failed to generate OTP",
                },
                { status: 500 }
            );
        }

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
        console.error(
            "Register API Error:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
            },
            { status: 500 }
        );
    }
}
