import type { Route } from "./+types/dashboard.analytics";

export async function loader({ request }: Route.LoaderArgs) {
  // No auth check needed here - handled by layout
  return {};
}

export default function Analytics() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          No analytics data yet
        </h2>
        <p className="text-gray-600 max-w-md">
          Connect your social media accounts and start receiving comments to see analytics here
        </p>
      </div>
    </div>
  );
}
