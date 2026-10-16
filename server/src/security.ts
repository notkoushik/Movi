import { createHash, randomBytes } from "node:crypto"
import bcrypt from "bcryptjs"

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export function createSessionToken() {
  const token = randomBytes(32).toString("base64url")
  return { token, tokenHash: hashSessionToken(token) }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash)
}

export function toSafeUser(
  user: import("./types.js").UserRecord,
): import("./types.js").SafeUser {
  const { passwordHash: _passwordHash, ...safeUser } = user
  return safeUser
}
