import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import Organization from "@/models/Organization";
import User from "@/models/User";
import Task from "@/models/Task";
import Project from "@/models/Project";
import { currentUser } from "@/lib/auth";

function clean(value: unknown) {
  if (value === undefined || value === null) return null;
  const result = String(value).trim();
  return result || null;
}

function serialize(organization: {
  _id: unknown;
  name: string;
  logo?: string | null;
  description?: string | null;
  owner_user_id: unknown;
}) {
  return {
    _id: String(organization._id),
    name: organization.name,
    logo: organization.logo || null,
    description: organization.description || null,
    owner_user_id: String(organization.owner_user_id),
  };
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

    const organization = user.organization_id
      ? await Organization.findById(user.organization_id).lean()
      : await Organization.findOne({ owner_user_id: user._id }).lean();

    return NextResponse.json({
      success: true,
      data: organization ? serialize(organization) : null,
    });
  } catch (error) {
    console.error("GET /api/organizations Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load organization" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    if (Number(user.user_role) !== 1) {
      return NextResponse.json(
        { success: false, message: "Only admins can manage the organization" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const name = clean(body.name);

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Organization name is required" },
        { status: 400 }
      );
    }

    const organization = await Organization.findOneAndUpdate(
      { owner_user_id: user._id },
      {
        $set: {
          name,
          logo: clean(body.logo),
          description: clean(body.description),
          status: true,
        },
        $setOnInsert: {
          owner_user_id: user._id,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    const organizationId = organization._id;

    // Adopt legacy records created by this admin when the organization is first configured.
    await User.updateMany(
      {
        $and: [
          { $or: [{ _id: user._id }, { created_by: user._id }] },
          { $or: [{ organization_id: null }, { organization_id: { $exists: false } }] },
        ],
      },
      { $set: { organization_id: organizationId } }
    );
    await Task.updateMany(
      {
        $and: [
          { $or: [{ admin_id: user._id }, { created_by: user._id }] },
          { $or: [{ organization_id: null }, { organization_id: { $exists: false } }] },
        ],
      },
      { $set: { organization_id: organizationId } }
    );
    await Project.updateMany(
      {
        $and: [
          { created_by: user._id },
          { $or: [{ organization_id: null }, { organization_id: { $exists: false } }] },
        ],
      },
      { $set: { organization_id: organizationId } }
    );

    await User.updateOne(
      { _id: user._id },
      { $set: { organization_id: organizationId } }
    );

    return NextResponse.json({
      success: true,
      message: "Organization saved successfully",
      data: serialize(organization),
    });
  } catch (error) {
    console.error("POST /api/organizations Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save organization" },
      { status: 500 }
    );
  }
}
