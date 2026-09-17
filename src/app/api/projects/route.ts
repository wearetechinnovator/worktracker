import { NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/dbConnect";
import Project from "@/models/Project";
import User from "@/models/User";
import { currentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await dbConnect();

    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      name,
      short_description,
      project_users,
      start_date,
      end_date,
      client,
      status,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Project name is required",
        },
        { status: 400 }
      );
    }

    const validProjectUserIds = Array.isArray(project_users)
      ? await User.find({
          _id: { $in: project_users.filter((id: string) => mongoose.Types.ObjectId.isValid(id)) },
          user_role: 2,
          created_by: user._id,
        }).distinct("_id")
      : [];

    const project = await Project.create({
      name: name.trim(),
      short_description: short_description?.trim() || "",
      project_users: validProjectUserIds,
      start_date: start_date || undefined,
      end_date: end_date || null,
      client:
        client && mongoose.Types.ObjectId.isValid(client)
          ? client
          : null,

      // IMPORTANT:
      // Never trust created_by from frontend
      created_by: user._id,

      modified_by: null,
      status: status ?? true,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Project created successfully",
        data: project,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create Project API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create project",
      },
      { status: 500 }
    );
  }
}


export async function GET() {
  try {
    await dbConnect();

    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const projects = await Project.find({ created_by: user._id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error("GET PROJECTS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load projects",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await dbConnect();

    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid project id is required",
        },
        { status: 400 }
      );
    }

    const body = await req.json();

    const updateData: Record<string, any> = {};

    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }

    if (body.short_description !== undefined) {
      updateData.short_description =
        body.short_description?.trim() || "";
    }

    if (body.project_users !== undefined) {
      updateData.project_users = Array.isArray(body.project_users)
        ? body.project_users.filter((memberId: string) =>
          mongoose.Types.ObjectId.isValid(memberId)
        )
        : [];
    }

    if (body.start_date !== undefined) {
      updateData.start_date = body.start_date;
    }

    if (body.end_date !== undefined) {
      updateData.end_date = body.end_date;
    }

    if (body.client !== undefined) {
      updateData.client =
        body.client &&
          mongoose.Types.ObjectId.isValid(body.client)
          ? body.client
          : null;
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    // Never trust modified_by from frontend
    updateData.modified_by = user._id;

    const validProjectUserIds = Array.isArray(body.project_users)
      ? await User.find({
          _id: { $in: body.project_users.filter((memberId: string) => mongoose.Types.ObjectId.isValid(memberId)) },
          user_role: 2,
          created_by: user._id,
        }).distinct("_id")
      : undefined;

    if (validProjectUserIds !== undefined) {
      updateData.project_users = validProjectUserIds;
    }

    const project = await Project.findOneAndUpdate(
      { _id: id, created_by: user._id },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          message: "Project not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Project updated successfully",
      data: project,
    });
  } catch (error) {
    console.error("UPDATE PROJECT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update project",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();

    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid project id is required",
        },
        { status: 400 }
      );
    }

    const deletedProject = await Project.findByIdAndDelete(id);

    if (!deletedProject) {
      return NextResponse.json(
        {
          success: false,
          message: "Project not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete Project API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete project",
      },
      { status: 500 }
    );
  }
}