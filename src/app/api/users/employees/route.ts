import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { currentUser } from "@/lib/auth";

/* =========================================================
   GET EMPLOYEES
   ========================================================= */

export async function GET() {
  try {
    await dbConnect();

    const admin = await currentUser();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    if (Number(admin.user_role) !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Only admins can view employees",
        },
        { status: 403 }
      );
    }

    const employees = await User.find({
      user_role: 2,

      // Only employees created by this admin
      created_by: admin._id,
    })
      .select(
        [
          "_id",
          "full_name",
          "email",
          "phone_number",
          "designation",
          "role_id",
          "group",
          "profile_picture",
          "status",
          "isVerify",
          "created_by",
          "settings_id",
        ].join(" ")
      )
      .sort({ createdAt: -1 })
      .lean();

    const data = employees.map(
      (employee: any) => ({
        ...employee,

        _id: String(employee._id),

        role_id: employee.role_id
          ? String(employee.role_id)
          : null,

        settings_id: employee.settings_id
          ? String(employee.settings_id)
          : null,

        created_by: employee.created_by
          ? String(employee.created_by)
          : null,

        name:
          employee.full_name ||
          "Unknown User",

        role:
          employee.designation ||
          "Employee",

        userType: "employee",

        avatarColor: "#3b82f6",
      })
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "GET /api/users/employees Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load employees",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   CREATE EMPLOYEE
   ========================================================= */

export async function POST(
  request: Request
) {
  try {
    await dbConnect();

    const admin = await currentUser();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    if (Number(admin.user_role) !== 1) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only admins can create employees",
        },
        { status: 403 }
      );
    }

    /* =====================================================
       ADMIN SETTINGS REQUIRED
    ===================================================== */

    if (!admin.settings_id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin settings are not configured",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const name = String(
      body.name || ""
    ).trim();

    const email = String(
      body.email || ""
    )
      .trim()
      .toLowerCase();

    const password = String(
      body.password || ""
    ).trim();

    const designation = String(
      body.designation ||
      body.role ||
      "Employee"
    ).trim();

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Name, email and password are required",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       CHECK EMAIL
    ===================================================== */

    const existingUser =
      await User.findOne({
        email,
      });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A user with this email already exists",
        },
        { status: 409 }
      );
    }

    /* =====================================================
       CREATE EMPLOYEE
    ===================================================== */
    const hashedPassword = await bcrypt.hash(
      password,
      10
    );
    const normalizedEmail = String(email)
      .toLowerCase()
      .trim();
    const normalizedName = String(name)
      .toLowerCase()
      .trim();
    const employee =
      await User.create({
        full_name: normalizedName,
        email: normalizedEmail,


        password: hashedPassword,

        designation,

        role_id:
          body.role_id || null,

        group:
          body.group || null,

        phone_number:
          body.phone_number || null,

        profile_picture:
          body.profile_picture || null,

        // 2 = Employee
        user_role: 2,


        settings_id:
          admin.settings_id,

        /*
         * Ownership
         */
        created_by:
          admin._id,

        modified_by:
          admin._id,

        status: true,

        isVerify: true,
      });

    /* =====================================================
       RESPONSE
    ===================================================== */

    const data = {
      _id: String(
        employee._id
      ),

      name:
        employee.full_name,

      full_name:
        employee.full_name,

      email:
        employee.email,

      phone_number:
        employee.phone_number,

      designation:
        employee.designation,

      role_id:
        employee.role_id
          ? String(employee.role_id)
          : null,

      settings_id:
        employee.settings_id
          ? String(employee.settings_id)
          : null,

      role:
        employee.designation ||
        "Employee",

      group:
        employee.group,

      profile_picture:
        employee.profile_picture,

      status:
        employee.status,

      isVerify:
        employee.isVerify,

      user_role:
        employee.user_role,

      userType:
        "employee",

      created_by:
        String(employee.created_by),

      avatarColor:
        "#3b82f6",
    };

    return NextResponse.json(
      {
        success: true,
        message:
          "Employee created successfully",
        data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/users/employees Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to create employee",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   UPDATE EMPLOYEE
   ========================================================= */

export async function PATCH(
  req: NextRequest
) {
  try {
    await dbConnect();

    const loggedInUser =
      await currentUser();

    if (!loggedInUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Authentication required",
        },
        { status: 401 }
      );
    }

    if (
      Number(
        loggedInUser.user_role
      ) !== 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only admin can update employees",
        },
        { status: 403 }
      );
    }

    const id =
      req.nextUrl.searchParams.get(
        "id"
      );

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Employee ID is required",
        },
        { status: 400 }
      );
    }

    const body =
      await req.json();

    const updateData: Record<
      string,
      unknown
    > = {};

    /* =====================================================
       FULL NAME
    ===================================================== */

    if (
      body.full_name !==
      undefined
    ) {
      updateData.full_name =
        String(
          body.full_name
        ).trim();
    }

    /* =====================================================
       EMAIL
    ===================================================== */

    if (
      body.email !==
      undefined
    ) {
      const email =
        String(
          body.email
        )
          .trim()
          .toLowerCase();

      const existingEmployee =
        await User.findOne({
          _id: {
            $ne: id,
          },

          email: {
            $regex: `^${email.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            )}$`,
            $options: "i",
          },
        });

      if (existingEmployee) {
        return NextResponse.json(
          {
            success: false,
            message:
              "A user with this email already exists",
          },
          { status: 409 }
        );
      }

      updateData.email =
        email;
    }

    /* =====================================================
       DESIGNATION
    ===================================================== */

    if (
      body.designation !==
      undefined
    ) {
      updateData.designation =
        String(
          body.designation
        ).trim();
    }

    /* =====================================================
       ROLE
    ===================================================== */

    if (
      body.role_id !==
      undefined
    ) {
      updateData.role_id =
        body.role_id ||
        null;
    }

    /* =====================================================
       GROUP
    ===================================================== */

    if (
      body.group !==
      undefined
    ) {
      updateData.group =
        body.group ||
        null;
    }

    /* =====================================================
       PHONE
    ===================================================== */

    if (
      body.phone_number !==
      undefined
    ) {
      updateData.phone_number =
        body.phone_number ||
        null;
    }

    /* =====================================================
       STATUS
    ===================================================== */

    if (
      body.status !==
      undefined
    ) {
      updateData.status =
        Boolean(
          body.status
        );
    }

    /* =====================================================
       WORK MODE
       ===================================================== */

    if (
      body.workMode !==
      undefined
    ) {
      updateData.workMode =
        body.workMode;
    }

    /* =====================================================
       PASSWORD
    ===================================================== */

    if (
      body.password?.trim()
    ) {
      updateData.password =
        await bcrypt.hash(
          body.password.trim(),
          12
        );
    }

    /* =====================================================
       IMPORTANT:
       settings_id IS NOT UPDATED HERE
       ===================================================== */

    updateData.modified_by =
      loggedInUser._id;

    /* =====================================================
       UPDATE ONLY OWN EMPLOYEE
    ===================================================== */

    const employee =
      await User.findOneAndUpdate(
        {
          _id: id,

          user_role: 2,

          /*
           * Admin can update only
           * employees created by them.
           */
          created_by:
            loggedInUser._id,
        },
        {
          $set: updateData,
        },
        {
          new: true,
          runValidators: true,
        }
      ).select(
        [
          "_id",
          "full_name",
          "email",
          "phone_number",
          "profile_picture",
          "designation",
          "role_id",
          "group",
          "settings_id",
          "user_role",
          "isVerify",
          "status",
          "created_by",
          "createdAt",
          "updatedAt",
        ].join(" ")
      );

    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Employee not found or you do not have access",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Employee updated successfully",
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
        message:
          "Failed to update employee",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE EMPLOYEE
   ========================================================= */

export async function DELETE(
  req: NextRequest
) {
  try {
    await dbConnect();

    const loggedInUser =
      await currentUser();

    if (!loggedInUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Authentication required",
        },
        { status: 401 }
      );
    }

    if (
      Number(
        loggedInUser.user_role
      ) !== 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only admin can delete employees",
        },
        { status: 403 }
      );
    }

    const id =
      req.nextUrl.searchParams.get(
        "id"
      );

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Employee ID is required",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       FIND ONLY THIS ADMIN'S EMPLOYEE
    ===================================================== */

    const employee =
      await User.findOne({
        _id: id,

        user_role: 2,

        created_by:
          loggedInUser._id,
      });

    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Employee not found or you do not have access",
        },
        { status: 404 }
      );
    }

    /* =====================================================
       DELETE
    ===================================================== */

    await User.deleteOne({
      _id: id,

      user_role: 2,

      created_by:
        loggedInUser._id,
    });

    return NextResponse.json({
      success: true,
      message:
        "Employee deleted successfully",

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
        message:
          "Failed to delete employee",
      },
      { status: 500 }
    );
  }
}