import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export async function POST(req: Request) {
    try {
        await dbConnect();

        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Email and password are required",
                },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({
            email: normalizedEmail,
        });

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid email or password",
                },
                { status: 401 }
            );
        }

        if (!user.isVerify) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Please verify your email first",
                },
                { status: 403 }
            );
        }

        const passwordMatched = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatched) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid email or password",
                },
                { status: 401 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Login successful",
            data: {
                id: user._id,
                full_name: user.full_name,
                email: user.email,
            },
        });
    } catch (error) {
        console.error("Login API Error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
            },
            { status: 500 }
        );
    }
}