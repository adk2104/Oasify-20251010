import type { Route } from "./+types/api.sync";
import { getSession } from "~/sessions.server";
import { db } from "~/db/config";
import { providers } from "~/db/schema";
import { eq } from "drizzle-orm";
import { syncYouTubeCommentsToDatabase } from "~/utils/youtube.server";
import { syncInstagramCommentsToDatabase } from "~/utils/instagram.server";
import type { SyncEvent } from "~/utils/youtube.server";

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
        // 🧮 Accumulating progress — each sync function reports its own totals
        // and we add them up as they come in. No more guessing!
        let globalCurrent = 0;
        let globalTotal = 0;

        const wrapCallback = (event: SyncEvent) => {
          if (event.type === 'total') {
            globalTotal += event.total;
            send({ type: 'total', total: globalTotal });
          } else if (event.type === 'progress') {
            globalCurrent++;
            send({ type: 'progress', current: globalCurrent, total: globalTotal });
          } else {
            send(event); // status messages pass through
          }
        };

        // Sync YouTube if connected
        if (hasYouTube) {
          send({ type: "status", message: "Fetching YouTube comments..." });
          await syncYouTubeCommentsToDatabase(userId, wrapCallback);
        }

        // Sync Instagram if connected
        if (hasInstagram) {
          send({ type: "status", message: "Fetching Instagram comments..." });
          await syncInstagramCommentsToDatabase(userId, wrapCallback);
        }

        // 🏁 Finish line
        send({ type: "done", current: globalCurrent, total: globalTotal });
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
