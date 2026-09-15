import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Session from "@/models/Session";

import { sessionCookie } from "@/lib/session";

export async function currentUser() {
  await dbConnect();

  const token = (await cookies()).get(sessionCookie.name)?.value;

  if (!token) {
    return null;
  }

  const session = await Session.findOne({
    sessionId: token,
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    return null;
  }

  const user = await User.findById(session.userId);

  if (!user) {
    return null;
  }

  return user;
}

export async function requireUser() {
  const user = await currentUser();

  return (
    user ??
    NextResponse.json(
      {
        success: false,
        error: "Authentication required",
      },
      { status: 401 }
    )
  );
}

export async function requirePermission(requiredPermission: string) {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication required",
      },
      { status: 401 }
    );
  }

  if (user.isSystemAdmin) {
    return user;
  }

  if (!user.permissions?.includes(requiredPermission)) {
    return NextResponse.json(
      {
        success: false,
        error: `Forbidden: Your role (${user.role || "User"}) lacks permission '${requiredPermission}'`,
      },
      { status: 403 }
    );
  }

  return user;
}

export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

