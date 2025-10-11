import { Outlet, redirect } from "react-router";
import type { Route } from "./+types/dashboard-layout";
import { getSession, destroySession } from "~/sessions.server";
import { AppSidebar } from "~/components/app-sidebar";
import { Header } from "~/components/header";
import { SidebarProvider } from "~/contexts/sidebar-context";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  if (!session.has("userId")) {
    return redirect("/");
  }

  return {
    userEmail: session.get("userEmail"),
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
  const { userEmail } = loaderData;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-gray-50">
        <AppSidebar />
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
