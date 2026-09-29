import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/dbConnect";
import KeepNote from "@/models/KeepNote";
import { currentUser } from "@/lib/auth";

/**
 * GET /api/keep-notes
 * Optional Query: ?search=...&pinned=true/false
 */
export async function GET(req: NextRequest) {
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

    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search");
    const pinned = searchParams.get("pinned");

    const filter: Record<string, unknown> = {
      userId: user._id,
    };

    if (pinned === "true") {
      filter.isPinned = true;
    } else if (pinned === "false") {
      filter.isPinned = false;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ title: regex }, { content: regex }];
    }

    const notes = await KeepNote.find(filter)
      .sort({ isPinned: -1, updatedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: notes.length,
      data: notes,
    });
  } catch (error) {
    console.error("GET /api/keep-notes Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load keep notes",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/keep-notes
 * Body: { title, content, color?, isPinned? }
 */
export async function POST(req: NextRequest) {
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
    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();
    const color = String(body.color || "#fef9c3").trim();
    const isPinned = Boolean(body.isPinned);

    if (!title && !content) {
      return NextResponse.json(
        {
          success: false,
          message: "A title or content is required for the note",
        },
        { status: 400 }
      );
    }

    const newNote = await KeepNote.create({
      userId: user._id,
      title: title || "Untitled Note",
      content,
      color: color || "#fef9c3",
      isPinned,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Note created successfully",
        data: newNote,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/keep-notes Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create note",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/keep-notes?id=...
 * Body: { title?, content?, color?, isPinned? }
 */
export async function PATCH(req: NextRequest) {
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
    const id = req.nextUrl.searchParams.get("id") || body.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid note ID is required",
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) {
      updateData.title = String(body.title).trim();
    }
    if (body.content !== undefined) {
      updateData.content = String(body.content).trim();
    }
    if (body.color !== undefined) {
      updateData.color = String(body.color).trim();
    }
    if (body.isPinned !== undefined) {
      updateData.isPinned = Boolean(body.isPinned);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No fields provided to update",
        },
        { status: 400 }
      );
    }

    const updated = await KeepNote.findOneAndUpdate(
      {
        _id: id,
        userId: user._id,
      },
      {
        $set: updateData,
      },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          message: "Note not found or you do not have permission to edit it",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Note updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("PATCH /api/keep-notes Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update note",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/keep-notes?id=...
 */
export async function DELETE(req: NextRequest) {
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

    const id = req.nextUrl.searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid note ID is required",
        },
        { status: 400 }
      );
    }

    const deleted = await KeepNote.findOneAndDelete({
      _id: id,
      userId: user._id,
    }).lean();

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          message: "Note not found or you do not have permission to delete it",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Note deleted successfully",
      data: { _id: id },
    });
  } catch (error) {
    console.error("DELETE /api/keep-notes Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete note",
      },
      { status: 500 }
    );
  }
}
