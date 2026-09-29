import crypto from "crypto";
import bcrypt from "bcryptjs";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "WT_ENC:v1";

/**
 * Derives a 32-byte key from the secret
 */
function getMasterKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_KEY || "worktracker_custom_aes256_secret_key_2026_xyz!#";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Checks if a stored password string is encrypted with this custom algorithm
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  return value.startsWith(`${PREFIX}:`);
}

/**
 * Encrypts a plaintext password using AES-256-GCM.
 * Output format: WT_ENC:v1:<iv_hex>:<tag_hex>:<cipher_hex>
 */
export function encryptPassword(plainText: string): string {
  if (!plainText) return "";

  const key = getMasterKey();
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${PREFIX}:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Reverses (decrypts) the encrypted password back to plaintext.
 * Can ONLY be reversed with this algorithm and key.
 */
export function decryptPassword(encryptedValue: string): string {
  if (!encryptedValue || typeof encryptedValue !== "string") return "";

  if (!isEncrypted(encryptedValue)) {
    // If not encrypted by our algorithm, return as is
    return encryptedValue;
  }

  try {
    const parts = encryptedValue.split(":");
    // Expect: ["WT_ENC", "v1", ivHex, tagHex, cipherHex]
    if (parts.length !== 5) {
      throw new Error("Invalid encrypted format");
    }

    const iv = Buffer.from(parts[2], "hex");
    const authTag = Buffer.from(parts[3], "hex");
    const cipherText = parts[4];

    const key = getMasterKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("[Encryption] Failed to decrypt password:", error);
    throw new Error("Failed to decrypt password. Invalid key or corrupted data.");
  }
}

/**
 * Compares a plaintext password against a stored password.
 * Supports:
 *  1. Custom encrypted passwords (decrypts and compares)
 *  2. Older bcrypt hashes (for seamless backwards compatibility)
 *  3. Plaintext legacy fallback
 */
export async function comparePassword(
  plainText: string,
  storedPassword: string | null | undefined
): Promise<boolean> {
  if (!storedPassword || !plainText) return false;

  // 1. Check if stored password is encrypted with our custom algorithm
  if (isEncrypted(storedPassword)) {
    try {
      const decrypted = decryptPassword(storedPassword);
      return decrypted === plainText;
    } catch {
      return false;
    }
  }

  // 2. Check if stored password is a legacy bcrypt hash
  if (
    storedPassword.startsWith("$2a$") ||
    storedPassword.startsWith("$2b$") ||
    storedPassword.startsWith("$2y$")
  ) {
    return bcrypt.compare(plainText, storedPassword);
  }

  // 3. Fallback direct match
  return plainText === storedPassword;
}
