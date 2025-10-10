import { Form, redirect } from "react-router";
import type { Route } from "./+types/dashboard";
import { requireUserId } from "~/utils/auth.server";
import { getSession, destroySession } from "~/sessions.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request);
  const session = await getSession(request.headers.get("Cookie"));
  const userEmail = session.get("userEmail");

  return { userId, userEmail };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  // Destroy the session and redirect to login
  return redirect("/", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { userId, userEmail } = loaderData;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Welcome! You are successfully logged in.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">User Information</p>
              <p className="text-sm text-blue-700 mt-1">Email: {userEmail}</p>
              <p className="text-sm text-blue-700">User ID: {userId}</p>
            </div>

            <Form method="post">
              <Button type="submit" variant="outline">
                Sign Out
              </Button>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
