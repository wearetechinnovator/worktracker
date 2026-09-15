import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import mongoose from "mongoose";

import dbConnect from "@/lib/dbConnect";
import Client from "@/models/Client";
import { currentUser } from "@/lib/auth";

function getNumericUserId(user: any): number | null {
  const value =
    user?.user_id ??
    user?.id ??
    user?.employee_id ??
    user?.userId;

  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numberValue = Number(value);

  return Number.isInteger(numberValue) ? numberValue : null;
}

function getClientLookup(id: string) {
  return mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ id }, { _id: id }] }
    : { id };
}

/**
 * GET /api/clients
 * GET /api/clients?id=CLIENT_ID
 */
export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const client = await Client.findOne(getClientLookup(id)).lean();

      if (!client) {
        return NextResponse.json(
          {
            success: false,
            message: "Client not found",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: client,
      });
    }

    const clients = await Client.find()
      .sort({ created_on: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: clients,
    });
  } catch (error) {
    console.error("GET CLIENTS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load clients",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clients
 */
export async function POST(req: Request) {
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

    const name = String(body.name || "").trim();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Client name is required",
        },
        { status: 400 }
      );
    }

    const emails = Array.isArray(body.emails)
      ? body.emails
          .map((email: unknown) => String(email).trim())
          .filter(Boolean)
      : [];

    const contacts = Array.isArray(body.contacts)
      ? body.contacts
          .filter((contact: any) => contact && typeof contact === "object")
          .map((contact: any) => ({
            name: String(contact.name || "").trim(),
            email: String(contact.email || "").trim(),
            phone: String(contact.phone || "").trim(),
            designation: String(contact.designation || "").trim(),
            label: String(contact.label || "").trim(),
          }))
      : [];

    /*
     * Your DB schema does not have a separate "phone" column.
     *
     * So if primary phone exists, keep it as a contact member.
     */
    const primaryPhone = String(body.phone || "").trim();

    if (
      primaryPhone &&
      !contacts.some(
        (contact: any) => contact.phone === primaryPhone
      )
    ) {
      contacts.unshift({
        name: "",
        email: "",
        phone: primaryPhone,
        designation: "",
        label: "Primary",
      });
    }

    let qdId = null;

    if (body.qd_id) {
      if (!mongoose.Types.ObjectId.isValid(body.qd_id)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid qd_id",
          },
          { status: 400 }
        );
      }

      qdId = new mongoose.Types.ObjectId(body.qd_id);
    }

    const client = await Client.create({
      id: String(body.id || `client-${randomUUID()}`),
      qd_id: qdId,
      name,
      email: emails,
      address: String(body.address || "").trim(),
      contact_members: contacts,
      created_by: getNumericUserId(user),
      created_on: new Date(),
      modified_by: null,
      modified_on: null,
      status:
        body.status !== undefined
          ? Number(body.status)
          : 1,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Client created successfully",
        data: client,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("CREATE CLIENT ERROR:", error);

    if (error?.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "A client with this id already exists",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create client",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/clients?id=CLIENT_ID
 */
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Client id is required",
        },
        { status: 400 }
      );
    }

    const body = await req.json();

    const updateData: Record<string, any> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            message: "Client name is required",
          },
          { status: 400 }
        );
      }

      updateData.name = name;
    }

    if (body.emails !== undefined) {
      updateData.email = Array.isArray(body.emails)
        ? body.emails
            .map((email: unknown) => String(email).trim())
            .filter(Boolean)
        : [];
    }

    if (body.address !== undefined) {
      updateData.address = String(body.address || "").trim();
    }

    if (body.contacts !== undefined) {
      const contacts = Array.isArray(body.contacts)
        ? body.contacts
            .filter(
              (contact: any) =>
                contact && typeof contact === "object"
            )
            .map((contact: any) => ({
              name: String(contact.name || "").trim(),
              email: String(contact.email || "").trim(),
              phone: String(contact.phone || "").trim(),
              designation: String(
                contact.designation || ""
              ).trim(),
              label: String(contact.label || "").trim(),
            }))
        : [];

      updateData.contact_members = contacts;
    }

    if (body.qd_id !== undefined) {
      if (!body.qd_id) {
        updateData.qd_id = null;
      } else if (
        !mongoose.Types.ObjectId.isValid(body.qd_id)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid qd_id",
          },
          { status: 400 }
        );
      } else {
        updateData.qd_id = new mongoose.Types.ObjectId(
          body.qd_id
        );
      }
    }

    if (body.status !== undefined) {
      updateData.status = Number(body.status);
    }

    updateData.modified_by = getNumericUserId(user);
    updateData.modified_on = new Date();

    const client = await Client.findOneAndUpdate(
      getClientLookup(id),
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          message: "Client not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Client updated successfully",
      data: client,
    });
  } catch (error) {
    console.error("UPDATE CLIENT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update client",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clients?id=CLIENT_ID
 */
export async function DELETE(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Client id is required",
        },
        { status: 400 }
      );
    }

    const client = await Client.findOneAndDelete(getClientLookup(id));

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          message: "Client not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Client deleted successfully",
      data: client,
    });
  } catch (error) {
    console.error("DELETE CLIENT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete client",
      },
      { status: 500 }
    );
  }
}