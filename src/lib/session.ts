import "server-only";

import crypto from "node:crypto";

export type Session = {
  userId: string;
  userType: "admin" | "employee";
  expiresAt: number;
};

const COOKIE_NAME = "worktracker_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

export function createSessionId() {
  return crypto.randomBytes(32).toString("hex");
}

export function getSessionExpiry() {
  return new Date(Date.now() + MAX_AGE_SECONDS * 1000);
}

export const sessionCookie = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  },
};

