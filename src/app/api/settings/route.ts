import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import { currentUser } from "@/lib/auth";
import Settings from "@/models/Settings";
import User from "@/models/User";

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
   GET OR CREATE ADMIN SETTINGS
   ========================================================= */

async function getOrCreateAdminSettings(admin: any) {
  let settings = null;

  if (admin.settings_id) {
    settings = await Settings.findOne({
      _id: admin.settings_id,
      status: 1,
    });
  }

  if (!settings) {
    settings = await Settings.findOne({
      owner_user_id: admin._id,
      status: 1,
    });
  }

  if (!settings) {
    settings = await Settings.create({
      owner_user_id: admin._id,
      punchInGeoRequired: false,
      punchInIpRequired: false,
      punchInBrowserRequired: false,
      punchInSystemIdRequired: false,
      punchOutGeoRequired: false,
      punchOutIpRequired: false,
      punchOutBrowserRequired: false,
      punchOutSystemIdRequired: false,
      punchInStartTime: null,
      punchInEndTime: null,
      punchOutStartTime: null,
      punchOutEndTime: null,
      taskIdPrefix: "QT",
      nextTaskNumber: 1,
      created_by: admin._id,
      created_on: new Date(),
      status: 1,
    });
  }

  if (!admin.settings_id || String(admin.settings_id) !== String(settings._id)) {
    try {
      await User.findByIdAndUpdate(admin._id, { $set: { settings_id: settings._id } });
      admin.settings_id = settings._id;
    } catch (e) {
      console.error("Failed to sync admin.settings_id:", e);
    }
  }

  return settings;
}

/* =========================================================
   REQUIRE ADMIN / SETTINGS MANAGER
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

  const isAdmin = Number(user.user_role) === 1 || Boolean(user.isSystemAdmin);
  const hasSettingsManage = Array.isArray(user.permissions) && user.permissions.includes("settings:manage");

  if (!isAdmin && !hasSettingsManage) {
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

    const isAdmin = Number(user.user_role) === 1 || Boolean(user.isSystemAdmin);

    if (isAdmin) {
      const adminSettings = await getOrCreateAdminSettings(user);
      return NextResponse.json({
        success: true,
        data: serializeSettings(adminSettings),
      });
    }

    // For employees: find their admin's settings
    let employeeSettings = null;
    if (user.settings_id) {
      employeeSettings = await Settings.findOne({
        _id: user.settings_id,
        status: 1,
      }).lean();
    }

    if (!employeeSettings && user.created_by) {
      employeeSettings = await Settings.findOne({
        owner_user_id: user.created_by,
        status: 1,
      }).lean();
    }

    if (!employeeSettings) {
      const fallbackAdmin = await User.findOne({ user_role: 1, status: true });
      if (fallbackAdmin) {
        employeeSettings = await Settings.findOne({
          owner_user_id: fallbackAdmin._id,
          status: 1,
        }).lean();
      }
    }

    if (!employeeSettings) {
      return NextResponse.json(
        {
          success: false,
          message: "Settings not found for this organization",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: serializeSettings(employeeSettings),
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

    const adminSettings =
      await getOrCreateAdminSettings(admin);

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
        body.punchInStartTime && String(body.punchInStartTime).trim()
          ? String(body.punchInStartTime).trim()
          : null;
    }

    if (
      body.punchInEndTime !==
      undefined
    ) {
      updateData.punchInEndTime =
        body.punchInEndTime && String(body.punchInEndTime).trim()
          ? String(body.punchInEndTime).trim()
          : null;
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
        body.punchOutStartTime && String(body.punchOutStartTime).trim()
          ? String(body.punchOutStartTime).trim()
          : null;
    }

    if (
      body.punchOutEndTime !==
      undefined
    ) {
      updateData.punchOutEndTime =
        body.punchOutEndTime && String(body.punchOutEndTime).trim()
          ? String(body.punchOutEndTime).trim()
          : null;
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
      await Settings.findByIdAndUpdate(
        adminSettings._id,
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