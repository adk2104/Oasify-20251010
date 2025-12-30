import { Link, redirect } from "react-router";
import type { Route } from "./+types/landing";
import { Button } from "~/components/ui/button";
import { getSession } from "~/sessions.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  // If already logged in, redirect to inbox (dashboard)
  if (session.has("userId")) {
    return redirect("/dashboard");
  }

  return {};
}

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-xl font-bold text-gray-900">Oasify</div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-white">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            Manage your YouTube & Instagram comments in one place
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Connect your social accounts, see all comments in a unified inbox, and respond with empathy using AI-powered suggestions.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-white">
                Get Started for Free
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center gap-6 text-sm text-gray-500">
          <Link to="/terms" className="hover:text-gray-700">
            Terms & Conditions
          </Link>
          <span className="text-gray-300">•</span>
          <Link to="/privacy" className="hover:text-gray-700">
            Privacy Policy
          </Link>
          <span className="text-gray-300">•</span>
          <Link to="/delete-data" className="hover:text-gray-700">
            Delete My Data
          </Link>
        </div>
      </footer>
    </div>
  );
}
