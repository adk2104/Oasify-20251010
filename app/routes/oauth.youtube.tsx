import type { Route } from "./+types/oauth.youtube";
import { Link } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  return {};
}

export default function YouTubeOAuth() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto text-red-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Connect YouTube</h1>
          <p className="text-gray-600 mb-6">
            YouTube OAuth integration coming soon. You'll be able to connect your YouTube account to manage comments directly from Oasify.
          </p>
          <Link
            to="/dashboard"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
