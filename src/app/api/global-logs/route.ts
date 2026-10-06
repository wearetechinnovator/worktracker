import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import GlobalLog from "@/models/GlobalLog";
import { currentUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        {
          status: 401,
        }
      );
    }

    // Only admin can see global logs
    if (Number(user.user_role) !== 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    const { searchParams } =
      new URL(req.url);

    const page = Math.max(
      1,
      Number(searchParams.get("page")) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number(searchParams.get("limit")) || 20
      )
    );

    const search =
      searchParams.get("search")?.trim() || "";

    const action =
      searchParams.get("action")?.trim() || "";

    const entityType =
      searchParams
        .get("entity_type")
        ?.trim() || "";

    /* =====================================================
       FILTER
    ===================================================== */

    const filter: Record<string, any> = {
      status: true,
    };

    if (action) {
      filter.action = action;
    }

    if (entityType) {
      filter.entity_type = entityType;
    }

    /* =====================================================
       SEARCH
    ===================================================== */

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        {
          description: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
        {
          action: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
        {
          entity_type: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
      ];
    }

    /* =====================================================
       COUNT
    ===================================================== */

    const total =
      await GlobalLog.countDocuments(
        filter
      );

    const totalPages =
      Math.max(
        1,
        Math.ceil(total / limit)
      );

    const safePage =
      Math.min(page, totalPages);

    /* =====================================================
       FETCH
    ===================================================== */

    const logs =
      await GlobalLog.find(filter)
        .populate(
          "actor_id",
          "_id full_name email"
        )
        .populate(
          "target_user_id",
          "_id full_name email"
        )
        .sort({
          created_at: -1,
        })
        .skip(
          (safePage - 1) * limit
        )
        .limit(limit)
        .lean();

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      logs,

      total,

      page: safePage,

      limit,

      totalPages,
    });
  } catch (error: any) {
    console.error(
      "GLOBAL LOGS API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Failed to fetch global logs",
      },
      {
        status: 500,
      }
    );
  }
}