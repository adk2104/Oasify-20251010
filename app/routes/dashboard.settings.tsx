import type { Route } from "./+types/dashboard.settings";

export async function loader({ request }: Route.LoaderArgs) {
  // No auth check needed here - handled by layout
  return {};
}

export default function Settings() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-gray-500">
            Manage your account and preferences
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Account Settings</h2>
            <p className="text-gray-600">
              Coming soon: Update your profile, notification preferences, and account settings.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Connected Platforms</h2>
            <p className="text-gray-600">
              Coming soon: Manage your YouTube and Instagram connections.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">AI Settings</h2>
            <p className="text-gray-600">
              Coming soon: Configure AI-powered response suggestions and sentiment analysis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
