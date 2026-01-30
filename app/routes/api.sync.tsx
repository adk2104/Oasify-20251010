import type { Route } from "./+types/api.sync";
import { getSession } from "~/sessions.server";
import { db } from "~/db/config";
import { providers } from "~/db/schema";
import { eq, and } from "drizzle-orm";
import { getYouTubeCommentCount, syncYouTubeCommentsToDatabase } from "~/utils/youtube.server";
import { getInstagramCommentCount, syncInstagramCommentsToDatabase } from "~/utils/instagram.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId") as number;

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check which providers are connected
  const userProviders = await db
    .select({ platform: providers.platform })
    .from(providers)
    .where(eq(providers.userId, userId));

  const hasYouTube = userProviders.some((p) => p.platform === "youtube");
  const hasInstagram = userProviders.some((p) => p.platform === "instagram");

  if (!hasYouTube && !hasInstagram) {
    return new Response("No providers connected", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream may be closed
        }
      };

      try {
        // Step 1: Get total counts
        // 🔍 Let the user know we're doing the recon work first
        send({ type: "status", message: "Counting comments..." });

        let totalCount = 0;

        if (hasYouTube) {
          const ytData = await getYouTubeCommentCount(userId);
          totalCount += ytData.total;
        }

        if (hasInstagram) {
          const igCount = await getInstagramCommentCount(userId);
          totalCount += igCount;
        }

        send({ type: "total", total: totalCount });

        let currentCount = 0;

        // Step 2: Sync YouTube if connected
        if (hasYouTube) {
          send({ type: "status", message: "Syncing YouTube comments..." });
          await syncYouTubeCommentsToDatabase(userId, (processed) => {
            currentCount++;
            send({ type: "progress", current: currentCount, total: totalCount });
          });
        }

        // Step 3: Sync Instagram if connected
        if (hasInstagram) {
          send({ type: "status", message: "Syncing Instagram comments..." });
          await syncInstagramCommentsToDatabase(userId, (processed) => {
            currentCount++;
            send({ type: "progress", current: currentCount, total: totalCount });
          });
        }

        // Done
        send({ type: "done", current: currentCount, total: totalCount });
      } catch (error) {
        console.error("[SYNC SSE] Error:", error);
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Sync failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
