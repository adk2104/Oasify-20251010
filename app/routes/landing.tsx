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
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Video Background Container - Ready for future video */}
      <div className="absolute inset-0 -z-10">
        {/* Placeholder gradient - replace with video element when ready */}
        {/* 
          To add video background, uncomment and customize:
          <video 
            autoPlay 
            muted 
            loop 
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/videos/oasis-background.mp4" type="video/mp4" />
          </video>
        */}
        <div className="absolute inset-0 bg-gradient-to-br from-oasis-100 via-white to-calm-50" />
        
        {/* Decorative elements - peaceful waves/circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-oasis-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-calm-200/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-oasis-100/40 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Header */}
      <header className="relative bg-white/60 backdrop-blur-md border-b border-oasis-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-xl font-bold bg-gradient-to-r from-oasis-600 to-calm-500 bg-clip-text text-transparent">
            Oasify
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-16 relative">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Tagline pill */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-oasis-100/80 backdrop-blur-sm border border-oasis-200 text-oasis-700 text-sm font-medium">
            ✨ Your peaceful comment management oasis
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-warm-800 leading-tight">
            Manage your YouTube & Instagram comments{" "}
            <span className="bg-gradient-to-r from-oasis-500 to-calm-500 bg-clip-text text-transparent">
              with peace of mind
            </span>
          </h1>
          
          <p className="text-lg text-warm-600 max-w-2xl mx-auto leading-relaxed">
            Connect your social accounts, see all comments in a unified inbox, and respond with empathy using AI-powered suggestions. Transform overwhelming notifications into calm, manageable conversations.
          </p>
          
          <div className="flex gap-4 justify-center pt-4">
            <Link to="/signup">
              <Button size="lg" className="shadow-lg shadow-oasis-200">
                Start Your Journey
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-6 pt-8 text-warm-500 text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-calm-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Free to start</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-calm-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-calm-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>AI-powered empathy</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative bg-white/60 backdrop-blur-md border-t border-oasis-100 py-6">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center gap-6 text-sm text-warm-500">
          <Link to="/terms" className="hover:text-oasis-600 transition-colors">
            Terms & Conditions
          </Link>
          <span className="text-oasis-200">•</span>
          <Link to="/privacy" className="hover:text-oasis-600 transition-colors">
            Privacy Policy
          </Link>
          <span className="text-oasis-200">•</span>
          <Link to="/delete-data" className="hover:text-oasis-600 transition-colors">
            Delete My Data
          </Link>
        </div>
      </footer>
    </div>
  );
}
