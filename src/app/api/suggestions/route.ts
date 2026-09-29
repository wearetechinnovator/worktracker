import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/dbConnect";
import Suggestion from "@/models/ProjectSuggetions";
import { currentUser } from "@/lib/auth";

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

    const isAdmin =
      Number(user.user_role) === 1 ||
      Boolean(user.isSystemAdmin) ||
      user.role === "admin";

    const { searchParams } = req.nextUrl;
    const id = searchParams.get("id");
    const userId = searchParams.get("user_id");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // -----------------------------
    // GET SINGLE SUGGESTION
    // -----------------------------
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid suggestion ID",
          },
          { status: 400 }
        );
      }

      const suggestion = await Suggestion.findById(id)
        .populate("user_id", "full_name email designation profile_picture profile")
        .populate("approved_by", "full_name email")
        .lean();

      if (!suggestion) {
        return NextResponse.json(
          {
            success: false,
            message: "Suggestion not found",
          },
          { status: 404 }
        );
      }

      // If not admin, ensure this suggestion belongs to the current user
      const ownerId =
        typeof suggestion.user_id === "object" && suggestion.user_id !== null
          ? (suggestion.user_id as any)._id?.toString()
          : suggestion.user_id?.toString();

      if (!isAdmin && ownerId !== user._id.toString()) {
        return NextResponse.json(
          {
            success: false,
            message: "You do not have permission to view this suggestion",
          },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: suggestion,
      });
    }

    // -----------------------------
    // GET MULTIPLE SUGGESTIONS
    // -----------------------------
    const filter: Record<string, unknown> = {};

    if (isAdmin) {
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        filter.user_id = userId;
      }
    } else {
      // Employees can only view their own suggestions
      filter.user_id = user._id;
    }

    if (status !== null && status !== undefined && status !== "") {
      const s = status.toLowerCase();
      if (s === "approved" || s === "true") {
        filter.$or = [{ status: "approved" }, { status: true }, { status: "true" }];
      } else if (s === "rejected") {
        filter.status = "rejected";
      } else if (s === "pending" || s === "false") {
        filter.$or = [{ status: "pending" }, { status: false }, { status: "false" }, { status: { $exists: false } }];
      }
    }

    if (search && search.trim()) {
      filter.suggestion = { $regex: search.trim(), $options: "i" };
    }

    const rawSuggestions = await Suggestion.find(filter)
      .populate("user_id", "full_name email designation profile_picture profile")
      .populate("approved_by", "full_name email")
      .sort({ createdAt: -1 })
      .lean();

    // Normalize status for backward compatibility
    const suggestions = rawSuggestions.map((item: any) => {
      let normalizedStatus: "pending" | "approved" | "rejected" = "pending";
      if (item.status === "approved" || item.status === true || item.status === "true") {
        normalizedStatus = "approved";
      } else if (item.status === "rejected") {
        normalizedStatus = "rejected";
      } else {
        normalizedStatus = "pending";
      }

      return {
        ...item,
        status: normalizedStatus,
      };
    });

    return NextResponse.json({
      success: true,
      count: suggestions.length,
      data: suggestions,
    });
  } catch (error) {
    console.error("GET /api/suggestions Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load suggestions",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/suggestions
 * Body: { "suggestion": "..." }
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
    const suggestionText = String(body.suggestion || "").trim();

    if (!suggestionText) {
      return NextResponse.json(
        {
          success: false,
          message: "Suggestion text is required",
        },
        { status: 400 }
      );
    }

    const newSuggestion = await Suggestion.create({
      user_id: user._id,
      suggestion: suggestionText,
      status: "pending",
      message: "",
    });

    const populated = await Suggestion.findById(newSuggestion._id)
      .populate("user_id", "full_name email designation profile_picture profile")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Suggestion submitted successfully",
        data: {
          ...populated,
          status: "pending",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/suggestions Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create suggestion",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/suggestions?id=...
 * Admin Body: { "status": "approved" | "rejected", "message": "Feedback message" }
 * Employee Body: { "suggestion": "Updated text" }
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

    const id = req.nextUrl.searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid suggestion ID is required",
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const isAdmin =
      Number(user.user_role) === 1 ||
      Boolean(user.isSystemAdmin) ||
      user.role === "admin";

    if (isAdmin) {
      // Admin flow: Approve or Reject with feedback message
      const adminMessage = String(body.message || "").trim();
      let newStatus: "approved" | "rejected" = "approved";

      if (body.status === "rejected" || body.status === false) {
        newStatus = "rejected";
      } else {
        newStatus = "approved";
      }

      if (!adminMessage) {
        return NextResponse.json(
          {
            success: false,
            message: `A response message from admin is required to ${newStatus} the suggestion`,
          },
          { status: 400 }
        );
      }

      const updatePayload: Record<string, unknown> = {
        status: newStatus,
        message: adminMessage,
        approved_by: user._id,
        approved_at: new Date(),
      };

      const updated = await Suggestion.findByIdAndUpdate(
        id,
        { $set: updatePayload },
        { new: true, runValidators: true }
      )
        .populate("user_id", "full_name email designation profile_picture profile")
        .populate("approved_by", "full_name email")
        .lean();

      if (!updated) {
        return NextResponse.json(
          {
            success: false,
            message: "Suggestion not found",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message:
          newStatus === "approved"
            ? "Suggestion approved and message sent successfully"
            : "Suggestion rejected and feedback message sent successfully",
        data: {
          ...updated,
          status: newStatus,
        },
      });
    } else {
      // Employee flow: Edit their own suggestion text
      const suggestionText = String(body.suggestion || "").trim();

      if (!suggestionText) {
        return NextResponse.json(
          {
            success: false,
            message: "Suggestion content cannot be empty",
          },
          { status: 400 }
        );
      }

      const updated = await Suggestion.findOneAndUpdate(
        {
          _id: id,
          user_id: user._id,
        },
        {
          $set: { suggestion: suggestionText },
        },
        { new: true, runValidators: true }
      )
        .populate("user_id", "full_name email designation profile_picture profile")
        .populate("approved_by", "full_name email")
        .lean();

      if (!updated) {
        return NextResponse.json(
          {
            success: false,
            message: "Suggestion not found or you do not have permission to edit it",
          },
          { status: 404 }
        );
      }

      const rawStatus = (updated as any).status;
      const normalizedStatus =
        rawStatus === "approved" || rawStatus === true || rawStatus === "true"
          ? "approved"
          : rawStatus === "rejected"
          ? "rejected"
          : "pending";

      return NextResponse.json({
        success: true,
        message: "Suggestion updated successfully",
        data: {
          ...updated,
          status: normalizedStatus,
        },
      });
    }
  } catch (error) {
    console.error("PATCH /api/suggestions Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update suggestion",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/suggestions?id=...
 * Employee can delete their own suggestion.
 * Admin can also delete if needed.
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
          message: "A valid suggestion ID is required",
        },
        { status: 400 }
      );
    }

    const isAdmin =
      Number(user.user_role) === 1 ||
      Boolean(user.isSystemAdmin) ||
      user.role === "admin";

    const deleteFilter: Record<string, unknown> = { _id: id };
    if (!isAdmin) {
      deleteFilter.user_id = user._id;
    }

    const deleted = await Suggestion.findOneAndDelete(deleteFilter).lean();

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          message: "Suggestion not found or you do not have permission to delete it",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Suggestion deleted successfully",
      data: { _id: id },
    });
  } catch (error) {
    console.error("DELETE /api/suggestions Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete suggestion",
      },
      { status: 500 }
    );
  }
}