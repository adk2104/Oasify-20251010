import { useState } from "react";
import { Form, Link, data, redirect } from "react-router";
import type { Route } from "./+types/signup";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Loader2, Mail } from "lucide-react";
import { getSession, commitSession } from "~/sessions.server";
import { createVerificationCode } from "~/utils/verification.server";
import { sendEmail, generateVerificationEmail } from "~/utils/email.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  if (session.has("userId")) {
    return redirect("/dashboard");
  }

  const error = session.get("error");

  return data(
    { error },
    {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    }
  );
}

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const formData = await request.formData();
  const email = formData.get("email");

  if (typeof email !== "string" || !email.includes("@")) {
    session.flash("error", "Please enter a valid email address");
    return redirect("/signup", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  }

  try {
    const { code, token } = await createVerificationCode(email);

    const baseUrl = new URL(request.url).origin;
    const magicLinkUrl = `${baseUrl}/verify?token=${token}`;

    const emailContent = generateVerificationEmail(code, magicLinkUrl);
    await sendEmail({
      to: email,
      ...emailContent,
    });

    session.set("pendingEmail", email);

    return redirect("/verify", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  } catch (error) {
    console.error("[SIGNUP ERROR]", error);
    session.flash("error", "Failed to send verification email. Please try again.");
    return redirect("/signup", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  }
}

export default function SignupPage({ loaderData }: Route.ComponentProps) {
  const { error } = loaderData;
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription>
            Enter your email to get started with Oasify
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4" onSubmit={() => setIsLoading(true)}>
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Continue with Email
            </Button>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <Link to="/login" className="text-cyan-500 hover:text-cyan-600 font-medium">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              By signing up, you agree to our{" "}
              <Link to="/terms" className="underline hover:text-gray-600">Terms</Link>
              {" "}and{" "}
              <Link to="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
