import { redirect } from "react-router";
import { getSession } from "~/sessions.server";
import { db } from "~/db/config";
import { users } from "~/db/schema";
import { eq } from "drizzle-orm";

export async function requireUserId(request: Request): Promise<number> {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    throw redirect("/login");
  }

  return userId;
}

export async function getUserId(request: Request): Promise<number | null> {
  const session = await getSession(request.headers.get("Cookie"));
  return session.get("userId") || null;
}

export async function findOrCreateUser(email: string): Promise<{ id: number; email: string }> {
  const normalizedEmail = email.toLowerCase();

  // Check if user exists
  const existingUser = await db.select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingUser.length > 0) {
    return existingUser[0];
  }

  // Create new user
  const newUser = await db.insert(users)
    .values({ email: normalizedEmail })
    .returning();

  return newUser[0];
}
