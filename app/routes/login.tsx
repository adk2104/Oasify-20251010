import { useState } from "react";
import { Form, data, redirect } from "react-router";
import type { Route } from "./+types/login";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Loader2 } from "lucide-react";
import { getSession, commitSession } from "~/sessions.server";
// import { verifyPassword } from "~/utils/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  // If already logged in, redirect to dashboard (or wherever)
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
  const password = formData.get("password");

  // Basic validation
  if (typeof email !== "string" || typeof password !== "string") {
    session.flash("error", "Invalid form submission");
    return redirect("/", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

  const mockUser = {
    id: 1,
    email: "demo@example.com",
  };

  if (email !== mockUser.email) {
    session.flash("error", "Invalid email or password");
    return redirect("/", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

  // Set session data
  session.set("userId", mockUser.id);
  session.set("userEmail", mockUser.email);

  // Login succeeded, redirect to dashboard
  return redirect("/dashboard", {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

export default function LoginPage({ loaderData }: Route.ComponentProps) {
  const { error } = loaderData;
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // Create form and submit
    const form = e.currentTarget.closest('form');
    if (form) {
      const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement;
      const passwordInput = form.querySelector('input[name="password"]') as HTMLInputElement;

      if (emailInput && passwordInput) {
        emailInput.value = "demo@example.com";
        passwordInput.value = "password";
        form.requestSubmit();
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Sign in to your Oasify account to manage your comments
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
                placeholder="creator@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleDemoLogin}
              disabled={isLoading}
            >
              🎭 Demo Login (Skip Database)
            </Button>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{" "}
              <button className="text-cyan-500 hover:text-cyan-600 font-medium">
                Create one here
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
