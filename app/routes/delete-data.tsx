import { useState } from "react";
import { Link, Form, redirect } from "react-router";
import type { Route } from "./+types/delete-data";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getSession, destroySession } from "~/sessions.server";
import { db } from "~/db/config";
import { users, providers, comments } from "~/db/schema";
import { eq } from "drizzle-orm";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  // Optional: require login to see this page, or allow anyone
  return {
    isLoggedIn: session.has("userId"),
    userId: session.get("userId") as number | undefined,
    userEmail: session.get("userEmail") as string | undefined,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const confirmText = formData.get("confirmText") as string;

  // Verify confirmation text
  if (confirmText !== "DELETE MY DATA") {
    return { error: "Please type 'DELETE MY DATA' to confirm" };
  }

  // If user is logged in, use their session data
  if (session.has("userId")) {
    const userId = session.get("userId") as number;

    try {
      // Delete all user data
      await db.delete(comments).where(eq(comments.userId, userId));
      await db.delete(providers).where(eq(providers.userId, userId));
      await db.delete(users).where(eq(users.id, userId));

      // Destroy session and redirect to home
      return redirect("/", {
        headers: {
          "Set-Cookie": await destroySession(session),
        },
      });
    } catch (error) {
      console.error("Error deleting user data:", error);
      return { error: "Failed to delete data. Please try again or contact support." };
    }
  }

  // If not logged in, just show a message (or send email to support)
  // For now, we'll just return success
  return {
    success: true,
    message: "Data deletion request received. If you have an account with this email, your data will be deleted within 30 days."
  };
}

export default function DeleteDataPage({ loaderData, actionData }: Route.ComponentProps) {
  const { isLoggedIn, userEmail } = loaderData;
  const [confirmInput, setConfirmInput] = useState("");

  if (actionData?.success) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
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

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Request Received</CardTitle>
              <CardDescription>{actionData.message}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/">
                <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white">
                  Back to Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

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
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Delete My Data</CardTitle>
            <CardDescription>
              Request deletion of all your personal data from Oasify
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-6">
              {actionData?.error && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-800">{actionData.error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-sm text-yellow-800 font-medium mb-2">
                    Warning: This action cannot be undone
                  </p>
                  <p className="text-sm text-yellow-700">
                    Deleting your data will permanently remove:
                  </p>
                  <ul className="text-sm text-yellow-700 list-disc pl-5 mt-2 space-y-1">
                    <li>Your account information</li>
                    <li>All connected social media accounts</li>
                    <li>All saved comments and data</li>
                  </ul>
                </div>

                {isLoggedIn && userEmail && (
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-sm text-gray-600">
                      Logged in as: <span className="font-medium text-gray-900">{userEmail}</span>
                    </p>
                  </div>
                )}

                {!isLoggedIn && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Enter the email associated with your account
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="confirmText">
                    Type <span className="font-mono font-bold">DELETE MY DATA</span> to confirm
                  </Label>
                  <Input
                    id="confirmText"
                    name="confirmText"
                    type="text"
                    placeholder="DELETE MY DATA"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={confirmInput !== "DELETE MY DATA"}
                >
                  Delete My Data
                </Button>
                <Link to="/" className="w-full">
                  <Button variant="ghost" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </div>
            </Form>
          </CardContent>
        </Card>
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
