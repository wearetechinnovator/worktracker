import { NextResponse } from "next/server";
import { comparePassword, encryptPassword } from "@/lib/encryption";

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { currentUser } from "@/lib/auth";

function cleanString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const valueString = String(value).trim();

  return valueString || null;
}

function serializeUser(user: any) {
  const gender = user.profile?.gender || user.gender || null;
  const propName = user.property?.name || user.property_name || null;
  const propLogo = user.property?.logo || user.property_logo || null;
  const propDesc =
    user.property?.short_description || user.short_description || null;

  return {
    _id: String(user._id),

    full_name: user.full_name || null,
    email: user.email || null,
    phone_number: user.phone_number ?? null,

    user_role: Number(user.user_role),

    designation: user.designation || null,
    group: user.group || null,

    gender,

    profile: {
      gender,
      profile_picture:
        user.profile?.profile_picture || user.profile_picture || null,
    },

    property: {
      name: propName,
      logo: propLogo,
      short_description: propDesc,
    },
  };
}

/* =========================================================
   GET PROFILE
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

    return NextResponse.json({
      success: true,
      data: serializeUser(user),
    });
  } catch (error) {
    console.error("GET /api/profile Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load profile",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   PATCH PROFILE
========================================================= */

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

    const body = await req.json();

    /* =====================================================
       CHANGE PASSWORD
    ===================================================== */

    if (body.change_password === true) {
      const currentPassword = String(body.current_password || "");
      const newPassword = String(body.new_password || "");
      const confirmPassword = String(body.confirm_password || "");

      if (!currentPassword) {
        return NextResponse.json(
          {
            success: false,
            message: "Current password is required",
          },
          { status: 400 }
        );
      }

      if (!newPassword) {
        return NextResponse.json(
          {
            success: false,
            message: "New password is required",
          },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          {
            success: false,
            message: "New password must be at least 6 characters",
          },
          { status: 400 }
        );
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          {
            success: false,
            message: "New password and confirm password do not match",
          },
          { status: 400 }
        );
      }

      if (currentPassword === newPassword) {
        return NextResponse.json(
          {
            success: false,
            message: "New password must be different from your current password",
          },
          { status: 400 }
        );
      }

      if (!user.password) {
        return NextResponse.json(
          {
            success: false,
            message: "Password is not configured for this account",
          },
          { status: 400 }
        );
      }

      const passwordMatches = await comparePassword(
        currentPassword,
        user.password
      );

      if (!passwordMatches) {
        return NextResponse.json(
          {
            success: false,
            message: "Current password is incorrect",
          },
          { status: 400 }
        );
      }

      const encryptedPassword = encryptPassword(newPassword);

      user.password = encryptedPassword;
      user.modified_by = user._id;

      await user.save();

      return NextResponse.json({
        success: true,
        message: "Password changed successfully",
      });
    }

    const fullName =
      body.full_name !== undefined
        ? cleanString(body.full_name)
        : undefined;

    const phoneNumber =
      body.phone_number !== undefined
        ? body.phone_number === null || body.phone_number === ""
          ? null
          : Number(body.phone_number)
        : undefined;

    const rawGender =
      body.gender !== undefined ? body.gender : body.profile?.gender;

    const gender =
      rawGender !== undefined ? cleanString(rawGender) : undefined;

    const rawProfilePicture =
      body.profile_picture !== undefined
        ? body.profile_picture
        : body.profile?.profile_picture;

    const profilePicture =
      rawProfilePicture !== undefined
        ? cleanString(rawProfilePicture)
        : undefined;

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (fullName !== undefined && !fullName) {
      return NextResponse.json(
        {
          success: false,
          message: "Name cannot be empty",
        },
        { status: 400 }
      );
    }

    if (
      phoneNumber !== undefined &&
      phoneNumber !== null &&
      !Number.isFinite(phoneNumber)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid phone number",
        },
        { status: 400 }
      );
    }

    if (
      gender !== undefined &&
      gender !== null &&
      ![
        "Male",
        "Female",
        "Other",
        "Prefer not to say",
      ].includes(gender)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid gender",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       COMMON PROFILE UPDATE
    ===================================================== */

    const updateData: Record<string, unknown> = {};

    if (fullName !== undefined) {
      updateData.full_name = fullName;
    }

    if (phoneNumber !== undefined) {
      updateData.phone_number = phoneNumber;
    }

    if (gender !== undefined) {
      updateData.gender = gender;
      updateData["profile.gender"] = gender;
    }

    if (profilePicture !== undefined) {
      updateData.profile_picture = profilePicture;
      updateData["profile.profile_picture"] = profilePicture;
    }

    /* =====================================================
       PROPERTY UPDATE
    ===================================================== */

    if (body.property !== undefined) {
      const property = body.property || {};

      if (property.name !== undefined) {
        const val = cleanString(property.name);
        updateData["property.name"] = val;
        updateData.property_name = val;
      }

      if (property.logo !== undefined) {
        const val = cleanString(property.logo);
        updateData["property.logo"] = val;
        updateData.property_logo = val;
      }

      if (property.short_description !== undefined) {
        const val = cleanString(property.short_description);
        updateData["property.short_description"] = val;
        updateData.short_description = val;
      }
    }

    /* =====================================================
       DIRECT PROPERTY FIELD ALIASES
    ===================================================== */

    if (body.property_name !== undefined || body.propertyName !== undefined) {
      const val = cleanString(body.property_name ?? body.propertyName);
      updateData["property.name"] = val;
      updateData.property_name = val;
    }

    if (body.property_logo !== undefined || body.propertyLogo !== undefined) {
      const val = cleanString(body.property_logo ?? body.propertyLogo);
      updateData["property.logo"] = val;
      updateData.property_logo = val;
    }

    if (
      body.short_description !== undefined ||
      body.shortDescription !== undefined
    ) {
      const val = cleanString(
        body.short_description ?? body.shortDescription
      );

      updateData["property.short_description"] = val;
      updateData.short_description = val;
    }

    /* =====================================================
       UPDATE
    ===================================================== */

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          ...updateData,
          modified_by: user._id,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: serializeUser(updatedUser),
    });
  } catch (error) {
    console.error("PATCH /api/profile Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update profile",
      },
      { status: 500 }
    );
  }
}
