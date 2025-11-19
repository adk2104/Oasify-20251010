import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>

          <div className="prose prose-gray">
            <p className="text-gray-600 mb-4">Last updated: {new Date().toLocaleDateString()}</p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Account information (email address)</li>
                <li>Social media account data (YouTube and Instagram)</li>
                <li>Comments and engagement data from connected platforms</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Provide and maintain our services</li>
                <li>Display your comments from YouTube and Instagram</li>
                <li>Generate AI-powered empathetic comment suggestions</li>
                <li>Improve and personalize your experience</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Data Storage and Security</h2>
              <p className="text-gray-700 leading-relaxed">
                We store your data securely using industry-standard encryption. Your social media
                access tokens are encrypted and stored securely. We do not share your personal
                information with third parties except as necessary to provide our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Third-Party Services</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                We integrate with the following third-party services:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>YouTube API for accessing your YouTube comments</li>
                <li>Instagram API for accessing your Instagram comments</li>
                <li>Anthropic Claude for AI-powered comment suggestions</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Your Rights</h2>
              <p className="text-gray-700 leading-relaxed">
                You have the right to access, update, or delete your personal information at any time.
                You can disconnect your social media accounts from our service at any time through
                the settings page.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Changes to This Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any
                changes by posting the new Privacy Policy on this page.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us through
                the application.
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
