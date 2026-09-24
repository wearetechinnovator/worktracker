import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { currentUser } from "@/lib/auth";
import { createGlobalLog } from "@/lib/globalLog";

/* =========================================================
   GET EMPLOYEES
   ========================================================= */

export async function GET() {
  try {
    await dbConnect();

    const admin =
      await currentUser();

    if (!admin) {
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
      Number(admin.user_role) !== 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only admins can view employees",
        },
        { status: 403 }
      );
    }

    const employees =
      await User.find({
        user_role: 2,

        created_by:
          admin._id,
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
        .sort({
          createdAt: -1,
        })
        .lean();

    const data =
      employees.map(
        (employee: any) => ({
          ...employee,

          _id: String(
            employee._id
          ),

          role_id:
            employee.role_id
              ? String(
                  employee.role_id
                )
              : null,

          settings_id:
            employee.settings_id
              ? String(
                  employee.settings_id
                )
              : null,

          created_by:
            employee.created_by
              ? String(
                  employee.created_by
                )
              : null,

          name:
            employee.full_name ||
            "Unknown User",

          role:
            employee.designation ||
            "Employee",

          userType:
            "employee",

          avatarColor:
            "#3b82f6",
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
        message:
          "Failed to load employees",
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

    const admin =
      await currentUser();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Authentication required",
        },
        { status: 401 }
      );
    }

    /* -------------------------
       ADMIN ONLY
    ------------------------- */

    if (
      Number(admin.user_role) !== 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only admins can create employees",
        },
        { status: 403 }
      );
    }

    /* -------------------------
       SETTINGS REQUIRED
    ------------------------- */

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

    const body =
      await request.json();

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

    const designation =
      String(
        body.designation ||
          body.role ||
          "Employee"
      ).trim();

    /* -------------------------
       VALIDATION
    ------------------------- */

    if (
      !name ||
      !email ||
      !password
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Name, email and password are required",
        },
        { status: 400 }
      );
    }

    /* -------------------------
       EMAIL CHECK
    ------------------------- */

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

    /* -------------------------
       PASSWORD
    ------------------------- */

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    const normalizedEmail =
      String(email)
        .toLowerCase()
        .trim();

    const normalizedName =
      String(name).trim();

    /* -------------------------
       CREATE EMPLOYEE
    ------------------------- */

    const employee =
      await User.create({
        full_name:
          normalizedName,

        email:
          normalizedEmail,

        password:
          hashedPassword,

        designation,

        role_id:
          body.role_id || null,

        group:
          body.group || null,

        phone_number:
          body.phone_number ||
          null,

        profile_picture:
          body.profile_picture ||
          null,

        // 2 = Employee
        user_role: 2,

        /* -------------------------
           SAME ADMIN SETTINGS
        ------------------------- */

        settings_id:
          admin.settings_id,

        /* -------------------------
           OWNERSHIP
        ------------------------- */

        created_by:
          admin._id,

        modified_by:
          admin._id,

        status: true,

        isVerify: true,
      });

    /* =====================================================
       GLOBAL LOG - CREATE EMPLOYEE
    ===================================================== */

    await createGlobalLog({
      actorId:
        String(admin._id),

      action: "CREATE",

      entityType: "User",

      entityId:
        String(employee._id),

      targetUserId:
        String(employee._id),

      description:
        `Created employee "${employee.full_name}"`,

      information: {
        full_name:
          employee.full_name,

        email:
          employee.email,

        designation:
          employee.designation,

        role_id:
          employee.role_id
            ? String(
                employee.role_id
              )
            : null,

        group:
          employee.group,

        phone_number:
          employee.phone_number,

        user_role:
          employee.user_role,

        settings_id:
          employee.settings_id
            ? String(
                employee.settings_id
              )
            : null,

        status:
          employee.status,

        isVerify:
          employee.isVerify,
      },
    });

    /* -------------------------
       RESPONSE DATA
    ------------------------- */

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
          ? String(
              employee.role_id
            )
          : null,

      settings_id:
        employee.settings_id
          ? String(
              employee.settings_id
            )
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
        String(
          employee.created_by
        ),

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
      {
        status: 201,
      }
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

    /* -------------------------
       ADMIN ONLY
    ------------------------- */

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

    /* -------------------------
       BODY
    ------------------------- */

    const body =
      await req.json();

    /* =====================================================
       GET OLD EMPLOYEE
       Used for audit information
    ===================================================== */

    const oldEmployee =
      await User.findOne({
        _id: id,

        user_role: 2,

        created_by:
          loggedInUser._id,
      }).lean();

    if (!oldEmployee) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Employee not found or you do not have access",
        },
        { status: 404 }
      );
    }

    const updateData: Record<
      string,
      unknown
    > = {};

    /* -------------------------
       FULL NAME
    ------------------------- */

    if (
      body.full_name !==
      undefined
    ) {
      updateData.full_name =
        String(
          body.full_name
        ).trim();
    }

    /* -------------------------
       EMAIL
    ------------------------- */

    if (
      body.email !==
      undefined
    ) {
      const email =
        String(body.email)
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

    /* -------------------------
       DESIGNATION
    ------------------------- */

    if (
      body.designation !==
      undefined
    ) {
      updateData.designation =
        String(
          body.designation
        ).trim();
    }

    /* -------------------------
       ROLE
    ------------------------- */

    if (
      body.role_id !==
      undefined
    ) {
      updateData.role_id =
        body.role_id || null;
    }

    /* -------------------------
       GROUP
    ------------------------- */

    if (
      body.group !==
      undefined
    ) {
      updateData.group =
        body.group || null;
    }

    /* -------------------------
       PHONE
    ------------------------- */

    if (
      body.phone_number !==
      undefined
    ) {
      updateData.phone_number =
        body.phone_number ||
        null;
    }

    /* -------------------------
       PROFILE PICTURE
    ------------------------- */

    if (
      body.profile_picture !==
      undefined
    ) {
      updateData.profile_picture =
        body.profile_picture ||
        null;
    }

    /* -------------------------
       STATUS
    ------------------------- */

    if (
      body.status !==
      undefined
    ) {
      updateData.status =
        Boolean(body.status);
    }

    /* -------------------------
       WORK MODE
    ------------------------- */

    if (
      body.workMode !==
      undefined
    ) {
      updateData.workMode =
        body.workMode;
    }

    /* -------------------------
       PASSWORD
    ------------------------- */

    if (
      body.password?.trim()
    ) {
      updateData.password =
        await bcrypt.hash(
          body.password.trim(),
          12
        );
    }

    /* -------------------------
       MODIFIED BY
    ------------------------- */

    updateData.modified_by =
      loggedInUser._id;

    /* =====================================================
       UPDATE
    ===================================================== */

    const employee =
      await User.findOneAndUpdate(
        {
          _id: id,

          user_role: 2,

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

    /* =====================================================
       GLOBAL LOG - UPDATE EMPLOYEE
    ===================================================== */

    await createGlobalLog({
      actorId:
        String(
          loggedInUser._id
        ),

      action: "UPDATE",

      entityType: "User",

      entityId:
        String(employee._id),

      targetUserId:
        String(employee._id),

      description:
        `Updated employee "${employee.full_name}"`,

      information: {
        before: {
          full_name:
            oldEmployee.full_name,

          email:
            oldEmployee.email,

          phone_number:
            oldEmployee.phone_number,

          designation:
            oldEmployee.designation,

          role_id:
            oldEmployee.role_id
              ? String(
                  oldEmployee.role_id
                )
              : null,

          group:
            oldEmployee.group,

          profile_picture:
            oldEmployee.profile_picture,

          status:
            oldEmployee.status,
        },

        after: {
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
              ? String(
                  employee.role_id
                )
              : null,

          group:
            employee.group,

          profile_picture:
            employee.profile_picture,

          status:
            employee.status,
        },
      },
    });

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

    /* -------------------------
       ADMIN ONLY
    ------------------------- */

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
       FIND EMPLOYEE FIRST
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
       GLOBAL LOG - DELETE
       ===================================================== */

    await createGlobalLog({
      actorId:
        String(
          loggedInUser._id
        ),

      action: "DELETE",

      entityType: "User",

      entityId:
        String(employee._id),

      targetUserId:
        String(employee._id),

      description:
        `Deleted employee "${employee.full_name}"`,

      information: {
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
            ? String(
                employee.role_id
              )
            : null,

        group:
          employee.group,

        profile_picture:
          employee.profile_picture,

        settings_id:
          employee.settings_id
            ? String(
                employee.settings_id
              )
            : null,

        created_by:
          employee.created_by
            ? String(
                employee.created_by
              )
            : null,

        status:
          employee.status,

        isVerify:
          employee.isVerify,
      },
    });

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