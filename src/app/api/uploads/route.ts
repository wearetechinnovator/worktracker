import { NextResponse } from "next/server";

import { currentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "A file is required" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const type = file.type || "application/octet-stream";

    return NextResponse.json({
      success: true,
      data: {
        name: file.name,
        url: `data:${type};base64,${base64}`,
        size: file.size,
        type,
      },
    });
  } catch (error: unknown) {
    console.error("POST /api/uploads ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to upload file",
      },
      { status: 500 }
    );
  }
}
