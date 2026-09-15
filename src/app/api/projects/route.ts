import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import connectDB from "@/lib/dbConnect";
import Project from "@/models/Project";

// =========================
// CREATE PROJECT
// POST /api/projects
// =========================
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      name,
      short_description,
      project_users,
      start_date,
      end_date,
      client,
      created_by,
      status,
    } = body;

    // Basic validation
    if (!name || !created_by) {
      return NextResponse.json(
        {
          success: false,
          message: "Project name and created_by are required",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(created_by)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid created_by",
        },
        { status: 400 }
      );
    }

    const project = await Project.create({
      name,
      short_description,
      project_users: project_users || [],
      start_date,
      end_date,
      client,
      created_by,
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
    console.error("CREATE PROJECT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create project",
      },
      { status: 500 }
    );
  }
}

// =========================
// FETCH PROJECTS
// GET /api/projects
// GET /api/projects?id=PROJECT_ID
// =========================
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const projects = await Project.find()
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      count: projects.length,
      data: projects,
    });

  } catch (error) {
    console.error("FETCH PROJECT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error
          ? error.message
          : "Failed to fetch projects",
      },
      { status: 500 }
    );
  }
}
// =========================
// UPDATE PROJECT
// PATCH /api/projects?id=PROJECT_ID
// =========================
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Project ID is required",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid project ID",
        },
        { status: 400 }
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
      modified_by,
      status,
      isVerify,
    } = body;

    if (modified_by && !mongoose.Types.ObjectId.isValid(modified_by)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid modified_by",
        },
        { status: 400 }
      );
    }

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      {
        ...(name !== undefined && { name }),
        ...(short_description !== undefined && {
          short_description,
        }),
        ...(project_users !== undefined && {
          project_users,
        }),
        ...(start_date !== undefined && {
          start_date,
        }),
        ...(end_date !== undefined && {
          end_date,
        }),
        ...(client !== undefined && {
          client,
        }),
        ...(modified_by !== undefined && {
          modified_by,
        }),
        ...(status !== undefined && {
          status,
        }),
        ...(isVerify !== undefined && {
          isVerify,
        }),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedProject) {
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
      data: updatedProject,
    });
  } catch (error) {
    console.error("UPDATE PROJECT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update project",
      },
      { status: 500 }
    );
  }
}

// =========================
// DELETE PROJECT
// DELETE /api/projects?id=PROJECT_ID
// =========================
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Project ID is required",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid project ID",
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
      data: deletedProject,
    });
  } catch (error) {
    console.error("DELETE PROJECT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete project",
      },
      { status: 500 }
    );
  }
}