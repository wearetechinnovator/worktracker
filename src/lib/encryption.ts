import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(plainText: string): Promise<string> {
  if (!plainText) return "";
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

export async function comparePassword(
  plainText: string,
  storedPassword: string | null | undefined,
): Promise<boolean> {
  if (!storedPassword || !plainText) return false;

  if (
    storedPassword.startsWith("$2a$") ||
    storedPassword.startsWith("$2b$") ||
    storedPassword.startsWith("$2y$")
  ) {
    return bcrypt.compare(plainText, storedPassword);
  }

  return false;
}
