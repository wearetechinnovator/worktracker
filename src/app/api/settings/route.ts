import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import { currentUser } from "@/lib/auth";
import Settings from "@/models/Settings";

function serializeSettings(
  settings: any
) {
  return {
    _id: settings?._id
      ? String(settings._id)
      : null,

    /* Punch In */
    punchInStartTime:
      settings?.punchInStartTime ??
      null,

    punchInEndTime:
      settings?.punchInEndTime ??
      null,

    punchInGeoRequired:
      Boolean(
        settings?.punchInGeoRequired
      ),

    punchInIpRequired:
      Boolean(
        settings?.punchInIpRequired
      ),

    punchInBrowserRequired:
      Boolean(
        settings?.punchInBrowserRequired
      ),

    punchInSystemIdRequired:
      Boolean(
        settings?.punchInSystemIdRequired
      ),

    /* Punch Out */
    punchOutStartTime:
      settings?.punchOutStartTime ??
      null,

    punchOutEndTime:
      settings?.punchOutEndTime ??
      null,

    punchOutGeoRequired:
      Boolean(
        settings?.punchOutGeoRequired
      ),

    punchOutIpRequired:
      Boolean(
        settings?.punchOutIpRequired
      ),

    punchOutBrowserRequired:
      Boolean(
        settings?.punchOutBrowserRequired
      ),

    punchOutSystemIdRequired:
      Boolean(
        settings?.punchOutSystemIdRequired
      ),

    /* Task */
    taskIdPrefix:
      settings?.taskIdPrefix ||
      "QT",

    nextTaskNumber:
      Math.max(
        1,
        Number(
          settings?.nextTaskNumber ||
            1
        )
      ),
  };
}

/* =========================================================
   REQUIRE ADMIN
   ========================================================= */

async function requireAdmin() {
  const user =
    await currentUser();

  if (!user) {
    return {
      user: null,

      response:
        NextResponse.json(
          {
            success: false,
            message:
              "Authentication required",
          },
          { status: 401 }
        ),
    };
  }

  if (
    Number(
      user.user_role
    ) !== 1
  ) {
    return {
      user: null,

      response:
        NextResponse.json(
          {
            success: false,
            message:
              "Only admins can manage settings",
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

/* =========================================================
   GET
   ========================================================= */

export async function GET() {
  try {
    await dbConnect();

    const auth =
      await requireAdmin();

    if (!auth.user) {
      return auth.response!;
    }

    const admin =
      auth.user;

    /* =====================================================
       ADMIN MUST HAVE SETTINGS
    ===================================================== */

    if (!admin.settings_id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Settings are not configured for this admin",
        },
        { status: 404 }
      );
    }

    /* =====================================================
       GET THIS ADMIN'S SETTINGS ONLY
    ===================================================== */

    const settings =
      await Settings.findOne({
        _id:
          admin.settings_id,

        owner_user_id:
          admin._id,

        status: 1,
      }).lean();

    if (!settings) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Settings not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data:
        serializeSettings(
          settings
        ),
    });
  } catch (error) {
    console.error(
      "GET /api/settings Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load settings",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   PATCH
   ========================================================= */

export async function PATCH(
  request: Request
) {
  try {
    await dbConnect();

    const auth =
      await requireAdmin();

    if (!auth.user) {
      return auth.response!;
    }

    const admin =
      auth.user;

    /* =====================================================
       ADMIN MUST HAVE SETTINGS
    ===================================================== */

    if (!admin.settings_id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Settings are not configured for this admin",
        },
        { status: 404 }
      );
    }

    const body =
      await request.json();

    const updateData: Record<
      string,
      unknown
    > = {};

    /* =====================================================
       PUNCH IN TIME
    ===================================================== */

    if (
      body.punchInStartTime !==
      undefined
    ) {
      updateData.punchInStartTime =
        body.punchInStartTime ||
        null;
    }

    if (
      body.punchInEndTime !==
      undefined
    ) {
      updateData.punchInEndTime =
        body.punchInEndTime ||
        null;
    }

    /* =====================================================
       PUNCH IN REQUIREMENTS
    ===================================================== */

    if (
      body.punchInGeoRequired !==
      undefined
    ) {
      updateData.punchInGeoRequired =
        Boolean(
          body.punchInGeoRequired
        );
    }

    if (
      body.punchInIpRequired !==
      undefined
    ) {
      updateData.punchInIpRequired =
        Boolean(
          body.punchInIpRequired
        );
    }

    if (
      body.punchInBrowserRequired !==
      undefined
    ) {
      updateData.punchInBrowserRequired =
        Boolean(
          body.punchInBrowserRequired
        );
    }

    if (
      body.punchInSystemIdRequired !==
      undefined
    ) {
      updateData.punchInSystemIdRequired =
        Boolean(
          body.punchInSystemIdRequired
        );
    }

    /* =====================================================
       PUNCH OUT TIME
    ===================================================== */

    if (
      body.punchOutStartTime !==
      undefined
    ) {
      updateData.punchOutStartTime =
        body.punchOutStartTime ||
        null;
    }

    if (
      body.punchOutEndTime !==
      undefined
    ) {
      updateData.punchOutEndTime =
        body.punchOutEndTime ||
        null;
    }

    /* =====================================================
       PUNCH OUT REQUIREMENTS
    ===================================================== */

    if (
      body.punchOutGeoRequired !==
      undefined
    ) {
      updateData.punchOutGeoRequired =
        Boolean(
          body.punchOutGeoRequired
        );
    }

    if (
      body.punchOutIpRequired !==
      undefined
    ) {
      updateData.punchOutIpRequired =
        Boolean(
          body.punchOutIpRequired
        );
    }

    if (
      body.punchOutBrowserRequired !==
      undefined
    ) {
      updateData.punchOutBrowserRequired =
        Boolean(
          body.punchOutBrowserRequired
        );
    }

    if (
      body.punchOutSystemIdRequired !==
      undefined
    ) {
      updateData.punchOutSystemIdRequired =
        Boolean(
          body.punchOutSystemIdRequired
        );
    }

    /* =====================================================
       TASK ID PREFIX
    ===================================================== */

    if (
      body.taskIdPrefix !==
      undefined
    ) {
      const taskIdPrefix =
        String(
          body.taskIdPrefix ||
            ""
        )
          .trim()
          .toUpperCase();

      if (
        !/^[A-Z0-9_-]{1,12}$/.test(
          taskIdPrefix
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Task ID prefix must be 1-12 letters, numbers, hyphens or underscores",
          },
          { status: 400 }
        );
      }

      updateData.taskIdPrefix =
        taskIdPrefix;
    }

    /* =====================================================
       NEXT TASK NUMBER
    ===================================================== */

    if (
      body.nextTaskNumber !==
      undefined
    ) {
      const nextTaskNumber =
        Number(
          body.nextTaskNumber
        );

      if (
        !Number.isInteger(
          nextTaskNumber
        ) ||
        nextTaskNumber < 1
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Next task number must be a positive whole number",
          },
          { status: 400 }
        );
      }

      updateData.nextTaskNumber =
        nextTaskNumber;
    }

    /* =====================================================
       AUDIT
    ===================================================== */

    updateData.modified_by =
      admin._id;

    updateData.modified_on =
      new Date();

    /* =====================================================
       UPDATE ONLY OWN SETTINGS
    ===================================================== */

    const settings =
      await Settings.findOneAndUpdate(
        {
          _id:
            admin.settings_id,

          owner_user_id:
            admin._id,

          status: 1,
        },
        {
          $set:
            updateData,
        },
        {
          new: true,
          runValidators: true,
        }
      ).lean();

    if (!settings) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Settings not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Settings updated successfully",

      data:
        serializeSettings(
          settings
        ),
    });
  } catch (error) {
    console.error(
      "PATCH /api/settings Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update settings",
      },
      { status: 500 }
    );
  }
}