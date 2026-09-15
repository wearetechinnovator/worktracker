import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { currentUser } from "@/lib/auth";




export async function GET() {
  try {
    await dbConnect();

    const admin = await currentUser();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    if (Number(admin.user_role) !== 1) {
      return NextResponse.json(
        { success: false, message: "Only admins can view employees" },
        { status: 403 }
      );
    }

    const employees = await User.find({
      user_role: 2,
      created_by: admin._id,
    })
      .select("_id full_name email phone_number designation group profile_picture status isVerify created_by")
      .sort({ createdAt: -1 })
      .lean();

    const data = employees.map((employee: any) => ({
      ...employee,
      _id: String(employee._id),
      name: employee.full_name || "Unknown User",
      role: employee.designation || "Employee",
      userType: "employee",
      avatarColor: "#3b82f6",
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET /api/users/employees Error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to load employees" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();

    const admin = await currentUser();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    if (Number(admin.user_role) !== 1) {
      return NextResponse.json(
        { success: false, message: "Only admins can create employees" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const designation = String(body.designation || body.role || "Employee").trim();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Name, email and password are required" },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const employee = await User.create({
      full_name: name,
      email,
      password,
      designation,
      group: body.group || null,
      phone_number: body.phone_number || null,
      profile_picture: body.profile_picture || null,
      user_role: 2,
      created_by: admin._id,
      modified_by: admin._id,
      status: body.status === false ? false : true,
      isVerify: false,
    });

    const data = {
      _id: String(employee._id),
      name: employee.full_name,
      full_name: employee.full_name,
      email: employee.email,
      phone_number: employee.phone_number,
      designation: employee.designation,
      role: employee.designation || "Employee",
      group: employee.group,
      profile_picture: employee.profile_picture,
      status: employee.status,
      isVerify: employee.isVerify,
      user_role: employee.user_role,
      userType: "employee",
      created_by: String(employee.created_by),
      avatarColor: "#3b82f6",
    };

    return NextResponse.json(
      { success: true, message: "Employee created successfully", data },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/users/employees Error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create employee" },
      { status: 500 }
    );
  }
}




export async function PATCH(req: NextRequest) {
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

    if (Number(loggedInUser.user_role) !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Only admin can update employees",
        },
        { status: 403 }
      );
    }

    const id = req.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee ID is required",
        },
        { status: 400 }
      );
    }

    const body = await req.json();

    const updateData: Record<string, unknown> = {};

    if (body.full_name !== undefined) {
      updateData.full_name = String(body.full_name).trim();
    }

    if (body.email !== undefined) {
      updateData.email = String(body.email)
        .trim()
        .toLowerCase();
    }

    if (body.designation !== undefined) {
      updateData.designation =
        String(body.designation).trim();
    }

    if (body.group !== undefined) {
      updateData.group = body.group || null;
    }

    if (body.status !== undefined) {
      updateData.status = Boolean(body.status);
    }

    if (body.workMode !== undefined) {
      updateData.workMode = body.workMode;
    }

    if (body.password?.trim()) {
      updateData.password = await bcrypt.hash(
        body.password.trim(),
        12
      );
    }

    updateData.modified_by = loggedInUser._id;

    const employee = await User.findOneAndUpdate(
      {
        _id: id,
        user_role: 2,
      },
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      }
    ).select(
      "_id full_name email phone_number profile_picture designation group user_role isVerify status createdAt updatedAt"
    );

    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Employee updated successfully",
      data: employee,
    });
  } catch (error) {
    console.error(
      "PATCH /api/users/employees Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update employee",
      },
      { status: 500 }
    );
  }
}


export async function DELETE(req: NextRequest) {
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

    if (Number(loggedInUser.user_role) !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Only admin can delete employees",
        },
        { status: 403 }
      );
    }

    const id = req.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee ID is required",
        },
        { status: 400 }
      );
    }

    const employee = await User.findOne({
      _id: id,
      user_role: 2,
    });

    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee not found",
        },
        { status: 404 }
      );
    }

    await User.deleteOne({
      _id: id,
      user_role: 2,
    });

    return NextResponse.json({
      success: true,
      message: "Employee deleted successfully",
      data: {
        _id: id,
      },
    });
  } catch (error) {
    console.error(
      "DELETE /api/users/employees Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete employee",
      },
      { status: 500 }
    );
  }
}