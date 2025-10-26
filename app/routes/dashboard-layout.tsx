import { Outlet, redirect } from "react-router";
import type { Route } from "./+types/dashboard-layout";
import { getSession, destroySession } from "~/sessions.server";
import { AppSidebar } from "~/components/app-sidebar";
import { Header } from "~/components/header";
import { SidebarProvider } from "~/contexts/sidebar-context";
import { db } from "~/db/config";
import { providers } from "~/db/schema";
import { eq } from "drizzle-orm";
import { validateYouTubeToken } from "~/utils/youtube.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  if (!session.has("userId")) {
    return redirect("/");
  }

  const userId = session.get("userId") as number;

  // Fetch user's connected providers
  const userProviders = await db
    .select()
    .from(providers)
    .where(eq(providers.userId, userId));

  // Validate YouTube tokens
  const providersWithValidation = await Promise.all(
    userProviders.map(async (provider) => {
      if (provider.platform === 'youtube') {
        const tokenValid = await validateYouTubeToken(provider);
        return {
          platform: provider.platform,
          isActive: provider.isActive,
          tokenValid,
        };
      }
      return {
        platform: provider.platform,
        isActive: provider.isActive,
      };
    })
  );

  return {
    userEmail: session.get("userEmail"),
    providers: providersWithValidation,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  // Destroy the session and redirect to login
  return redirect("/", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
  const { userEmail, providers } = loaderData;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-gray-50">
        <AppSidebar providers={providers} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header userEmail={userEmail} />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
