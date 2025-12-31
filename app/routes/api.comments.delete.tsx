import type { Route } from "./+types/api.comments.delete";
import { getSession } from "~/sessions.server";
import { db } from "~/db/config";
import { comments } from "~/db/schema";
import { eq, and } from "drizzle-orm";

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  if (!session.has("userId")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.get("userId") as number;
  const formData = await request.formData();
  const platform = formData.get("platform") as string | null;

  try {
    if (platform === "youtube" || platform === "instagram") {
      // Delete comments for specific platform
      await db
        .delete(comments)
        .where(and(eq(comments.userId, userId), eq(comments.platform, platform)));
    } else if (platform === "all") {
      // Delete all comments for user
      await db
        .delete(comments)
        .where(eq(comments.userId, userId));
    } else {
      return Response.json({ error: "Invalid platform specified" }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[DELETE COMMENTS] Error:", error);
    return Response.json({ error: "Failed to delete comments" }, { status: 500 });
  }
}
