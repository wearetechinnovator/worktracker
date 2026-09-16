import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import { currentUser } from "@/lib/auth";
import Role from "@/models/Role";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeRole(role: any) {
  return {
    _id: String(role._id),
    name: role.name,
    short_desc: role.short_desc || "",
    created_by: role.created_by ?? null,
    modified_by: role.modified_by ?? null,
    status: Number(role.status ?? 1),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

async function requireAdmin() {
  const user = await currentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      ),
    };
  }

  if (Number(user.user_role) !== 1) {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          message: "Only admin can manage roles",
        },
        { status: 403 }
      ),
    };
  }

  return {
    user,
    response: null,
  };
}

export async function GET() {
  try {
    await dbConnect();

    const roles = await Role.find({
      status: 1,
    })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: roles.map(serializeRole),
    });
  } catch (error) {
    console.error("GET /api/roles ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load roles",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();

    const auth = await requireAdmin();

    if (!auth.user) {
      return auth.response;
    }

    const body = await request.json();

    const name = String(body.name || "").trim();
    const short_desc = String(body.short_desc || "").trim();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Role name is required",
        },
        { status: 400 }
      );
    }

    const existingRole = await Role.findOne({
      name: {
        $regex: `^${escapeRegex(name)}$`,
        $options: "i",
      },
    });

    if (existingRole) {
      return NextResponse.json(
        {
          success: false,
          message: "Role already exists",
        },
        { status: 409 }
      );
    }

    const role = await Role.create({
      name,
      short_desc,
      status: 1,
      created_by: null,
      modified_by: null,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Role created successfully",
        data: serializeRole(role),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/roles ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create role",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await dbConnect();

    const auth = await requireAdmin();

    if (!auth.user) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Role id is required",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const updateData: Record<string, any> = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            message: "Role name cannot be empty",
          },
          { status: 400 }
        );
      }

      const duplicate = await Role.findOne({
        _id: { $ne: id },
        name: {
          $regex: `^${escapeRegex(name)}$`,
          $options: "i",
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message: "Another role with this name already exists",
          },
          { status: 409 }
        );
      }

      updateData.name = name;
    }

    if (typeof body.short_desc === "string") {
      updateData.short_desc = body.short_desc.trim();
    }

    updateData.modified_by = null;

    const role = await Role.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!role) {
      return NextResponse.json(
        {
          success: false,
          message: "Role not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Role updated successfully",
      data: serializeRole(role),
    });
  } catch (error) {
    console.error("PATCH /api/roles ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update role",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();

    const auth = await requireAdmin();

    if (!auth.user) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Role id is required",
        },
        { status: 400 }
      );
    }

    const role = await Role.findByIdAndDelete(id).lean();

    if (!role) {
      return NextResponse.json(
        {
          success: false,
          message: "Role not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Role deleted permanently",
      data: {
        _id: String(role._id),
        name: role.name,
      },
    });
  } catch (error) {
    console.error("DELETE /api/roles ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete role",
      },
      { status: 500 }
    );
  }
}
