import { Link, useLocation } from "react-router";
import { Home, BarChart3, Settings, Youtube, Instagram } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { useSidebar } from "~/contexts/sidebar-context";

const mainItems = [
  {
    title: "Inbox",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
];

const providerItems = [
  {
    title: "YouTube",
    url: "/oauth/google/start",
    icon: Youtube,
    platform: "youtube" as const,
  },
  {
    title: "Instagram",
    url: "/oauth/instagram",
    icon: Instagram,
    platform: "instagram" as const,
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "connected":
      return "bg-green-500";
    case "disconnected":
      return "bg-red-500";
    case "warning":
      return "bg-yellow-500";
    default:
      return "bg-gray-500";
  }
};

type Provider = {
  platform: string;
  isActive: boolean;
  tokenValid?: boolean;
};

type AppSidebarProps = {
  providers?: Provider[];
};

export function AppSidebar({ providers = [] }: AppSidebarProps) {
  const location = useLocation();
  const { isOpen, mounted } = useSidebar();

  // Helper to get connection status for a platform
  const getProviderStatus = (platform: string) => {
    const provider = providers.find((p) => p.platform === platform);
    if (!provider?.isActive) return "disconnected";
    if (provider.tokenValid === false) return "warning";
    return "connected";
  };

  return (
    <aside
      className={cn(
        "bg-slate-50 text-slate-900 flex flex-col border-r border-slate-200 overflow-hidden",
        mounted && "transition-all duration-200 ease-in-out",
        isOpen ? "w-64" : "w-0 -translate-x-full"
      )}
    >
      <div className="p-6">
        <h2 className="text-xl font-bold">Oasify</h2>
      </div>

      <nav className="flex-1 px-3 space-y-6">
        {/* Navigation Section */}
        <div>
          <h3 className="px-3 mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            Navigation
          </h3>
          <div className="space-y-1">
            {mainItems.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-slate-200 text-slate-900"
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Connected Accounts Section */}
        <div>
          <h3 className="px-3 mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            Connected Accounts
          </h3>
          <div className="space-y-1">
            {providerItems.map((item) => {
              const status = getProviderStatus(item.platform);
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <div className="relative">
                    <item.icon className="h-4 w-4" />
                    <div
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-slate-50",
                        getStatusColor(status)
                      )}
                    />
                  </div>
                  <span>{item.title}</span>
                  <Badge
                    variant={status === "connected" ? "default" : "secondary"}
                    className="ml-auto text-xs"
                  >
                    {status === "warning" ? "reconnect" : status}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </aside>
  );
}
