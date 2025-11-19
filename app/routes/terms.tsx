import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-gray-900">
            Oasify
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">Back to Home</Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-12">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms & Conditions</h1>

          <div className="prose prose-gray">
            <p className="text-gray-600 mb-4">Last updated: {new Date().toLocaleDateString()}</p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing and using Oasify, you accept and agree to be bound by the terms and
                provision of this agreement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Use License</h2>
              <p className="text-gray-700 leading-relaxed">
                Permission is granted to temporarily use Oasify for personal, non-commercial purposes.
                This is the grant of a license, not a transfer of title.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Social Media Integration</h2>
              <p className="text-gray-700 leading-relaxed">
                By connecting your YouTube or Instagram accounts, you authorize Oasify to access
                your comments and account information as specified during the OAuth authorization process.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. User Responsibilities</h2>
              <p className="text-gray-700 leading-relaxed">
                You are responsible for maintaining the confidentiality of your account and for all
                activities that occur under your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed">
                Oasify shall not be held liable for any damages arising from the use or inability
                to use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Contact</h2>
              <p className="text-gray-700 leading-relaxed">
                For questions about these Terms & Conditions, please contact us through the application.
              </p>
            </section>
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
