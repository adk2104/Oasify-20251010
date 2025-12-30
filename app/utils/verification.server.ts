import { db } from '~/db/config';
import { verificationCodes } from '~/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createVerificationCode(email: string): Promise<{
  code: string;
  token: string;
}> {
  const code = generateCode();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate any existing codes for this email
  await db.update(verificationCodes)
    .set({ used: true })
    .where(and(
      eq(verificationCodes.email, email.toLowerCase()),
      eq(verificationCodes.used, false)
    ));

  // Insert new code
  await db.insert(verificationCodes).values({
    email: email.toLowerCase(),
    code,
    token,
    expiresAt,
    used: false,
  });

  return { code, token };
}

export async function verifyCode(email: string, code: string): Promise<boolean> {
  const now = new Date();

  const result = await db.select()
    .from(verificationCodes)
    .where(and(
      eq(verificationCodes.email, email.toLowerCase()),
      eq(verificationCodes.code, code),
      eq(verificationCodes.used, false),
      gt(verificationCodes.expiresAt, now)
    ))
    .limit(1);

  if (result.length === 0) {
    return false;
  }

  // Mark code as used
  await db.update(verificationCodes)
    .set({ used: true })
    .where(eq(verificationCodes.id, result[0].id));

  return true;
}

export async function verifyToken(token: string): Promise<string | null> {
  const now = new Date();

  const result = await db.select()
    .from(verificationCodes)
    .where(and(
      eq(verificationCodes.token, token),
      eq(verificationCodes.used, false),
      gt(verificationCodes.expiresAt, now)
    ))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  // Mark code as used
  await db.update(verificationCodes)
    .set({ used: true })
    .where(eq(verificationCodes.id, result[0].id));

  return result[0].email;
}
