import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import dbConnect from "@/lib/dbConnect";
import Session from "@/models/Session";
import { sessionCookie } from "@/lib/session";

export async function POST() {
  try {
    await dbConnect();

    const cookieStore = await cookies();
    const sessionId = cookieStore.get(sessionCookie.name)?.value;

    if (sessionId) {
      await Session.deleteOne({
        sessionId,
      });
    }

    cookieStore.delete(sessionCookie.name);

    return NextResponse.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

