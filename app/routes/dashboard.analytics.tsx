import type { Route } from "./+types/dashboard.analytics";

export async function loader({ request }: Route.LoaderArgs) {
  // No auth check needed here - handled by layout
  return {};
}

export default function Analytics() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-sm text-gray-500">
            Insights and metrics for your content
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h2 className="text-2xl font-semibold mb-4">Analytics Dashboard</h2>
            <p className="text-gray-600">
              Coming soon: View engagement metrics, response times, sentiment analysis, and more.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
