import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import mongoose from "mongoose";

import dbConnect from "@/lib/dbConnect";
import Client from "@/models/Client";
import { currentUser } from "@/lib/auth";
import { createGlobalLog } from "@/lib/globalLog";

/* =========================================================
   USER ID HELPER
   ========================================================= */

function getUserId(user: {
  qd_id?: unknown;
  _id?: unknown;
}): string | null {
  const userId = user?.qd_id ?? user?._id;

  if (userId === undefined || userId === null || userId === "") {
    return null;
  }

  return String(userId);
}

/* =========================================================
   CLIENT LOOKUP
   ========================================================= */

function getClientLookup(id: string) {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return {
      $or: [
        { id: id },
        { _id: new mongoose.Types.ObjectId(id) },
      ],
    };
  }

  return {
    id: id,
  };
}

/* =========================================================
   PROJECT ID NORMALIZER
   ========================================================= */

function normalizeProjectIds(projects: unknown): string[] {
  if (!Array.isArray(projects)) {
    return [];
  }

  return projects
    .map((project) => {
      if (
        project &&
        typeof project === "object"
      ) {
        const item = project as any;

        return String(
          item._id ??
            item.id ??
            item.project_id ??
            ""
        ).trim();
      }

      return String(project).trim();
    })
    .filter(Boolean);
}

/* =========================================================
   PHONE HELPERS
   ========================================================= */

function normalizePhone(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function hasSamePhone(client: any, phone: string) {
  const target = normalizePhone(phone);

  if (!target) return false;

  return (
    normalizePhone(client.phone) === target ||
    (Array.isArray(client.contact_members) &&
      client.contact_members.some(
        (contact: any) =>
          normalizePhone(contact?.phone) === target
      ))
  );
}

/* =========================================================
   GET CLIENTS
   ========================================================= */

/**
 * GET /api/clients
 *
 * GET /api/clients?id=CLIENT_ID
 */
export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");

    const paramUserId =
      searchParams.get("userId") ||
      searchParams.get("created_by");

    const user = await currentUser();

    const userIds = Array.from(
      new Set(
        [
          getUserId(user),
          user?._id ? String(user._id) : null,
          user?.qd_id ? String(user.qd_id) : null,
          paramUserId
            ? String(paramUserId).trim()
            : null,
        ].filter(Boolean) as string[]
      )
    );

    if (userIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        {
          status: 401,
        }
      );
    }

    /* -------------------------
       GET SINGLE CLIENT
       ------------------------- */

    if (id) {
      const client = await Client.findOne(
        getClientLookup(id)
      ).lean();

      if (!client) {
        return NextResponse.json(
          {
            success: false,
            message: "Client not found",
          },
          {
            status: 404,
          }
        );
      }

      const isOwner = userIds.includes(
        String(client.created_by || "")
      );

      if (!isOwner) {
        return NextResponse.json(
          {
            success: false,
            message: "Access denied",
          },
          {
            status: 403,
          }
        );
      }

      return NextResponse.json({
        success: true,
        data: client,
      });
    }

    /* -------------------------
       GET CLIENTS FILTERED
       ------------------------- */

    const clients = await Client.find({
      created_by: {
        $in: userIds,
      },
    })
      .sort({
        created_on: -1,
      })
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
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   CREATE CLIENT
   ========================================================= */

/**
 * POST /api/clients
 */
export async function POST(req: Request) {
  try {
    await dbConnect();

    /* -------------------------
       AUTHENTICATED USER
       ------------------------- */

    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        {
          status: 401,
        }
      );
    }

    /* -------------------------
       CREATOR ID
       ------------------------- */

    const createdBy = getUserId(user);

    if (createdBy === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Logged-in user does not have a valid user ID.",
        },
        {
          status: 400,
        }
      );
    }

    /* -------------------------
       REQUEST BODY
       ------------------------- */

    const body = await req.json();

    /* -------------------------
       CLIENT NAME
       ------------------------- */

    const name = String(
      body.name || ""
    ).trim();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Client name is required",
        },
        {
          status: 400,
        }
      );
    }

    /* -------------------------
       EMAILS
       ------------------------- */

    const emails = Array.isArray(body.emails)
      ? body.emails
          .map((email: unknown) =>
            String(email).trim()
          )
          .filter(Boolean)
      : [];

    /* -------------------------
       CONTACTS
       ------------------------- */

    const contacts = Array.isArray(body.contacts)
      ? body.contacts
          .filter(
            (contact: any) =>
              contact &&
              typeof contact === "object"
          )
          .map((contact: any) => ({
            name: String(
              contact.name || ""
            ).trim(),

            email: String(
              contact.email || ""
            ).trim(),

            phone: String(
              contact.phone || ""
            ).trim(),

            designation: String(
              contact.designation || ""
            ).trim(),

            label: String(
              contact.label || ""
            ).trim(),
          }))
      : [];

    /* -------------------------
       PRIMARY PHONE
       ------------------------- */

    const primaryPhone = String(
      body.phone || ""
    ).trim();

    if (!primaryPhone) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Primary phone number is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!/^\d{10,20}$/.test(primaryPhone)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Phone number must contain only numbers and be 10-20 digits long",
        },
        {
          status: 400,
        }
      );
    }

    /* -------------------------
       DUPLICATE PHONE CHECK
       ------------------------- */

    const phoneCandidates = await Client.find({
      $or: [
        {
          phone: {
            $exists: true,
            $ne: "",
          },
        },
        {
          "contact_members.phone": {
            $exists: true,
            $ne: "",
          },
        },
      ],
    })
      .select(
        "name phone contact_members"
      )
      .lean();

    const duplicatePhoneClient =
      phoneCandidates.find(
        (client: any) =>
          hasSamePhone(
            client,
            primaryPhone
          )
      );

    if (duplicatePhoneClient) {
      return NextResponse.json(
        {
          success: false,
          message: `A client (${duplicatePhoneClient.name}) with this phone number already exists. Duplicate phone numbers cannot be added.`,
        },
        {
          status: 400,
        }
      );
    }

    /* -------------------------
       DUPLICATE EMAIL CHECK
       ------------------------- */

    const emailRegexes = emails.map(
      (e: string) =>
        new RegExp(
          `^${e.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )}$`,
          "i"
        )
    );

    const existingDuplicate =
      await Client.findOne({
        $or: [
          {
            email: {
              $in: emailRegexes,
            },
          },
          {
            "contact_members.email": {
              $in: emailRegexes,
            },
          },
        ],
      }).lean();

    if (existingDuplicate) {
      return NextResponse.json(
        {
          success: false,
          message: `A client (${existingDuplicate.name}) with this email already exists. Duplicate clients cannot be added.`,
        },
        {
          status: 400,
        }
      );
    }

    /* -------------------------
       PRIMARY PHONE INTO CONTACT
       ------------------------- */

    if (
      primaryPhone &&
      !contacts.some(
        (contact: any) =>
          contact.phone === primaryPhone
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

    /* -------------------------
       QD ID
       ------------------------- */

    let qdId:
      | mongoose.Types.ObjectId
      | null = null;

    if (body.qd_id) {
      if (
        !mongoose.Types.ObjectId.isValid(
          body.qd_id
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid qd_id",
          },
          {
            status: 400,
          }
        );
      }

      qdId =
        new mongoose.Types.ObjectId(
          body.qd_id
        );
    }

    /* -------------------------
       PROJECTS
       ------------------------- */

    const projects =
      normalizeProjectIds(
        body.projects
      );

    /* -------------------------
       CREATE
       ------------------------- */

    const client =
      await Client.create({
        id:
          String(body.id || "") ||
          `client-${randomUUID()}`,

        qd_id: qdId,

        projects,

        duration: String(
          body.duration || ""
        ).trim(),

        contract_start_date:
          body.contract_start_date ||
          null,

        contract_end_date:
          body.contract_end_date ||
          null,

        name,

        email: emails,

        phone: primaryPhone,

        address: String(
          body.address || ""
        ).trim(),

        contact_members: contacts,

        created_by: createdBy,

        created_on: new Date(),

        modified_by: null,

        modified_on: null,

        status:
          body.status !== undefined
            ? Number(body.status)
            : 1,
      });

    /* =====================================================
       GLOBAL LOG - CREATE CLIENT
       ===================================================== */

    await createGlobalLog({
      actorId: String(user._id),

      action: "CREATE",

      entityType: "Client",

      entityId: String(client._id),

      description: `Created client "${client.name}"`,

      information: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        projects: client.projects,
        duration: client.duration,
        contract_start_date:
          client.contract_start_date,
        contract_end_date:
          client.contract_end_date,
        status: client.status,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Client created successfully",
        data: client,
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error(
      "CREATE CLIENT ERROR:",
      error
    );

    if (error?.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A client with this id already exists",
        },
        {
          status: 409,
        }
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
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   UPDATE CLIENT
   ========================================================= */

/**
 * PATCH /api/clients?id=CLIENT_ID
 */
export async function PATCH(req: Request) {
  try {
    await dbConnect();

    /* -------------------------
       AUTH
       ------------------------- */

    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Authentication required",
        },
        {
          status: 401,
        }
      );
    }

    /* -------------------------
       MODIFIER ID
       ------------------------- */

    const modifiedBy = getUserId(user);

    if (modifiedBy === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Logged-in user does not have a valid user ID.",
        },
        {
          status: 400,
        }
      );
    }

    /* -------------------------
       CLIENT ID
       ------------------------- */

    const { searchParams } =
      new URL(req.url);

    const id =
      searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Client id is required",
        },
        {
          status: 400,
        }
      );
    }

    /* -------------------------
       GET OLD CLIENT
       ------------------------- */

    const oldClient =
      await Client.findOne(
        getClientLookup(id)
      ).lean();

    if (!oldClient) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Client not found",
        },
        {
          status: 404,
        }
      );
    }

    /* -------------------------
       BODY
       ------------------------- */

    const body = await req.json();

    const updateData: Record<
      string,
      any
    > = {};

    /* -------------------------
       NAME
       ------------------------- */

    if (body.name !== undefined) {
      const name = String(
        body.name
      ).trim();

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Client name is required",
          },
          {
            status: 400,
          }
        );
      }

      updateData.name = name;
    }

    /* -------------------------
       EMAIL
       ------------------------- */

    if (body.emails !== undefined) {
      const parsedEmails =
        Array.isArray(body.emails)
          ? body.emails
              .map((email: unknown) =>
                String(email).trim()
              )
              .filter(Boolean)
          : [];

      if (parsedEmails.length > 0) {
        const emailRegexes =
          parsedEmails.map(
            (e: string) =>
              new RegExp(
                `^${e.replace(
                  /[.*+?^${}()|[\]\\]/g,
                  "\\$&"
                )}$`,
                "i"
              )
          );

        const excludeConditions: Record<
          string,
          any
        >[] = [
          {
            id: {
              $ne: id,
            },
          },
        ];

        if (
          mongoose.Types.ObjectId.isValid(
            id
          )
        ) {
          excludeConditions.push({
            _id: {
              $ne:
                new mongoose.Types.ObjectId(
                  id
                ),
            },
          });
        }

        const duplicateClient =
          await Client.findOne({
            $and: [
              ...excludeConditions,
              {
                $or: [
                  {
                    email: {
                      $in: emailRegexes,
                    },
                  },
                  {
                    "contact_members.email": {
                      $in: emailRegexes,
                    },
                  },
                ],
              },
            ],
          }).lean();

        if (duplicateClient) {
          return NextResponse.json(
            {
              success: false,
              message: `Another client (${duplicateClient.name}) with this email already exists.`,
            },
            {
              status: 400,
            }
          );
        }
      }

      updateData.email =
        parsedEmails;
    }

    /* -------------------------
       ADDRESS
       ------------------------- */

    if (body.address !== undefined) {
      updateData.address =
        String(
          body.address || ""
        ).trim();
    }

    /* -------------------------
       PHONE
       ------------------------- */

    if (body.phone !== undefined) {
      const phone = String(
        body.phone || ""
      ).trim();

      if (!phone) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Primary phone number is required",
          },
          {
            status: 400,
          }
        );
      }

      if (!/^\d{10,20}$/.test(phone)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Phone number must contain only numbers and be 10-20 digits long",
          },
          {
            status: 400,
          }
        );
      }

      const phoneExclusions: Record<
        string,
        any
      >[] = [
        {
          id: {
            $ne: id,
          },
        },
      ];

      if (
        mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        phoneExclusions.push({
          _id: {
            $ne:
              new mongoose.Types.ObjectId(
                id
              ),
          },
        });
      }

      const phoneCandidates =
        await Client.find({
          $and: [
            ...phoneExclusions,
            {
              $or: [
                {
                  phone: {
                    $exists: true,
                    $ne: "",
                  },
                },
                {
                  "contact_members.phone": {
                    $exists: true,
                    $ne: "",
                  },
                },
              ],
            },
          ],
        })
          .select(
            "name phone contact_members"
          )
          .lean();

      const duplicatePhoneClient =
        phoneCandidates.find(
          (client: any) =>
            hasSamePhone(
              client,
              phone
            )
        );

      if (duplicatePhoneClient) {
        return NextResponse.json(
          {
            success: false,
            message: `Another client (${duplicatePhoneClient.name}) with this phone number already exists.`,
          },
          {
            status: 400,
          }
        );
      }

      updateData.phone = phone;

      if (
        body.contacts === undefined
      ) {
        updateData.contact_members =
          [
            {
              name: "",
              email: "",
              phone,
              designation: "",
              label: "Primary",
            },
          ];
      }
    }

    /* -------------------------
       CONTACTS
       ------------------------- */

    if (body.contacts !== undefined) {
      const contacts =
        Array.isArray(body.contacts)
          ? body.contacts
              .filter(
                (contact: any) =>
                  contact &&
                  typeof contact ===
                    "object"
              )
              .map(
                (contact: any) => ({
                  name: String(
                    contact.name ||
                      ""
                  ).trim(),

                  email: String(
                    contact.email ||
                      ""
                  ).trim(),

                  phone: String(
                    contact.phone ||
                      ""
                  ).trim(),

                  designation:
                    String(
                      contact.designation ||
                        ""
                    ).trim(),

                  label: String(
                    contact.label ||
                      ""
                  ).trim(),
                })
              )
          : [];

      updateData.contact_members =
        contacts;
    }

    /* -------------------------
       DURATION
       ------------------------- */

    if (
      body.duration !==
      undefined
    ) {
      updateData.duration =
        String(
          body.duration || ""
        ).trim();
    }

    /* -------------------------
       CONTRACT START
       ------------------------- */

    if (
      body.contract_start_date !==
      undefined
    ) {
      updateData.contract_start_date =
        body.contract_start_date ||
        null;
    }

    /* -------------------------
       CONTRACT END
       ------------------------- */

    if (
      body.contract_end_date !==
      undefined
    ) {
      updateData.contract_end_date =
        body.contract_end_date ||
        null;
    }

    /* -------------------------
       PROJECTS
       ------------------------- */

    if (
      body.projects !==
      undefined
    ) {
      updateData.projects =
        normalizeProjectIds(
          body.projects
        );
    }

    /* -------------------------
       QD ID
       ------------------------- */

    if (
      body.qd_id !==
      undefined
    ) {
      if (!body.qd_id) {
        updateData.qd_id = null;
      } else if (
        !mongoose.Types.ObjectId.isValid(
          body.qd_id
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid qd_id",
          },
          {
            status: 400,
          }
        );
      } else {
        updateData.qd_id =
          new mongoose.Types.ObjectId(
            body.qd_id
          );
      }
    }

    /* -------------------------
       STATUS
       ------------------------- */

    if (
      body.status !==
      undefined
    ) {
      updateData.status =
        Number(body.status);
    }

    /* -------------------------
       MODIFIED BY
       ------------------------- */

    updateData.modified_by =
      modifiedBy;

    updateData.modified_on =
      new Date();

    /* -------------------------
       UPDATE
       ------------------------- */

    const client =
      await Client.findOneAndUpdate(
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
          message:
            "Client not found",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       GLOBAL LOG - UPDATE CLIENT
       ===================================================== */

    await createGlobalLog({
      actorId: String(user._id),

      action: "UPDATE",

      entityType: "Client",

      entityId: String(client._id),

      description: `Updated client "${client.name}"`,

      information: {
        before: {
          id: oldClient.id,
          name: oldClient.name,
          email: oldClient.email,
          phone: oldClient.phone,
          address: oldClient.address,
          projects: oldClient.projects,
          duration: oldClient.duration,
          contract_start_date:
            oldClient.contract_start_date,
          contract_end_date:
            oldClient.contract_end_date,
          status: oldClient.status,
        },

        after: {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          address: client.address,
          projects: client.projects,
          duration: client.duration,
          contract_start_date:
            client.contract_start_date,
          contract_end_date:
            client.contract_end_date,
          status: client.status,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Client updated successfully",
      data: client,
    });
  } catch (error) {
    console.error(
      "UPDATE CLIENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update client",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   DELETE CLIENT
   ========================================================= */

/**
 * DELETE /api/clients?id=CLIENT_ID
 */
export async function DELETE(
  req: Request
) {
  try {
    await dbConnect();

    /* -------------------------
       AUTH
       ------------------------- */

    const user =
      await currentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Authentication required",
        },
        {
          status: 401,
        }
      );
    }

    /* -------------------------
       CLIENT ID
       ------------------------- */

    const { searchParams } =
      new URL(req.url);

    const id =
      searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Client id is required",
        },
        {
          status: 400,
        }
      );
    }

    /* -------------------------
       GET CLIENT FIRST
       ------------------------- */

    const client =
      await Client.findOne(
        getClientLookup(id)
      );

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Client not found",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       GLOBAL LOG - DELETE CLIENT
       ===================================================== */

    await createGlobalLog({
      actorId: String(user._id),

      action: "DELETE",

      entityType: "Client",

      entityId: String(client._id),

      description: `Deleted client "${client.name}"`,

      information: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        contact_members:
          client.contact_members,
        projects: client.projects,
        duration: client.duration,
        contract_start_date:
          client.contract_start_date,
        contract_end_date:
          client.contract_end_date,
        created_by:
          client.created_by,
        created_on:
          client.created_on,
        status: client.status,
      },
    });

    /* -------------------------
       DELETE
       ------------------------- */

    await Client.findOneAndDelete(
      getClientLookup(id)
    );

    return NextResponse.json({
      success: true,
      message:
        "Client deleted successfully",
      data: client,
    });
  } catch (error) {
    console.error(
      "DELETE CLIENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete client",
      },
      {
        status: 500,
      }
    );
  }
}