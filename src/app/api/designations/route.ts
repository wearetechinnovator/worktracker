import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import { currentUser } from "@/lib/auth";
import Designation from "@/models/Designation";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get("adminId") || searchParams.get("created_by") || searchParams.get("id");
    const fetchAll = searchParams.get("all") === "true";

    // Determine owner/creator ID based on role
    let creatorId =
      Number(user.user_role) === 1
        ? user._id
        : user.created_by || user._id;

    if (queryId && Number(user.user_role) === 1) {
      creatorId = queryId;
    }

    const filter: any = {
      status: 1,
    };

    if (!fetchAll || Number(user.user_role) !== 1) {
      filter.created_by = creatorId;
    }

    const designations = await Designation.find(filter)
      .select("_id name short_desc created_by")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: designations.map((item: any) => ({
        _id: String(item._id),
        name: item.name,
        short_desc: item.short_desc || "",
        created_by: item.created_by ? String(item.created_by) : null,
      })),
    });
  } catch (error) {
    console.error("GET /api/designations Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load designations",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    // Only admin can create designations
    if (Number(user.user_role) !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Only admins can create designations",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const name = String(body.name || "").trim();
    const shortDesc = String(body.short_desc || "").trim();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Designation name is required",
        },
        { status: 400 }
      );
    }

    // Check if designation already exists FOR THIS ADMIN
    const existingDesignation = await Designation.findOne({
      created_by: user._id,
      name: {
        $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    });

    if (existingDesignation) {
      return NextResponse.json(
        {
          success: false,
          message: "Designation already exists",
        },
        { status: 409 }
      );
    }

    const designation = await Designation.create({
      name,
      short_desc: shortDesc,
      created_by: user._id,
      modified_by: user._id,
      status: 1,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Designation created successfully",
        data: {
          _id: String(designation._id),
          name: designation.name,
          short_desc: designation.short_desc || "",
          created_by: String(designation.created_by),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/designations Error:", error);

    if (error?.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "Designation already exists",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create designation",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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

    if (Number(user.user_role) !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Only admins can delete designations",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Designation ID is required",
        },
        { status: 400 }
      );
    }

    const deleted = await Designation.findOneAndDelete({
      _id: id,
      created_by: user._id,
    });

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          message: "Designation not found or not owned by you",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Designation deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/designations Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete designation",
      },
      { status: 500 }
    );
  }
}