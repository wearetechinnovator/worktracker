import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { currentUser } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        await dbConnect();
        const loggedInUser = await currentUser();

        if (!loggedInUser) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Authentication required",
                },
                { status: 401 }
            );
        }

        if (loggedInUser.user_role !== 1) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Only admin can create employees",
                },
                { status: 403 }
            );
        }

        const {
            name,
            email,
            password,
            designation,
            group,
            status,
            workMode,
        } = await req.json();

        if (!name || !email || !password || !designation) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Name, email, password and designation are required",
                },
                { status: 400 }
            );
        }



        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await User.findOne({
            email: normalizedEmail,
        });

        if (existingUser) {
            return NextResponse.json(
                {
                    success: false,
                    message: "User with this email already exists",
                },
                { status: 409 }
            );
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const employee = await User.create({
            full_name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,

            // 2 means employee
            user_role: 2,

            designation: designation.trim(),
            group: group || null,

            // Admin-created employee can login directly
            isVerify: true,

            status: status === "Active",
            workMode: workMode || "Hybrid",

            created_by: loggedInUser._id,
        });

        return NextResponse.json(
            {
                success: true,
                message: "Employee created successfully",
                data: {
                    id: employee._id,
                    full_name: employee.full_name,
                    email: employee.email,
                    user_role: employee.user_role,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create Employee Error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
            },
            { status: 500 }
        );
    }
}