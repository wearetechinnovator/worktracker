import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import { currentUser } from "@/lib/auth";
import Designation from "@/models/Designation";

export async function GET() {
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

    const designations = await Designation.find({
      status: 1,
    })
      .select("_id name short_desc")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: designations.map((item: any) => ({
        _id: String(item._id),
        name: item.name,
        short_desc: item.short_desc || "",
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

    const existingDesignation = await Designation.findOne({
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