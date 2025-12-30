import { useState, useRef, useEffect } from "react";
import { Form, Link, data, redirect, useActionData } from "react-router";
import type { Route } from "./+types/verify";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { getSession, commitSession } from "~/sessions.server";
import { verifyCode, verifyToken, createVerificationCode } from "~/utils/verification.server";
import { findOrCreateUser } from "~/utils/auth.server";
import { sendEmail, generateVerificationEmail } from "~/utils/email.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (session.has("userId")) {
    return redirect("/dashboard");
  }

  // Handle magic link token
  if (token) {
    const email = await verifyToken(token);

    if (email) {
      const user = await findOrCreateUser(email);

      session.set("userId", user.id);
      session.set("userEmail", user.email);

      return redirect("/dashboard", {
        headers: { "Set-Cookie": await commitSession(session) },
      });
    } else {
      session.flash("error", "This link has expired or is invalid. Please request a new code.");
      return redirect("/login", {
        headers: { "Set-Cookie": await commitSession(session) },
      });
    }
  }

  const pendingEmail = session.get("pendingEmail");
  const error = session.get("error");

  if (!pendingEmail) {
    return redirect("/login");
  }

  return data(
    { email: pendingEmail, error },
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
  const intent = formData.get("intent");
  const pendingEmail = session.get("pendingEmail");

  if (!pendingEmail) {
    return redirect("/login");
  }

  // Handle resend code
  if (intent === "resend") {
    try {
      const { code, token } = await createVerificationCode(pendingEmail);
      const baseUrl = new URL(request.url).origin;
      const magicLinkUrl = `${baseUrl}/verify?token=${token}`;

      const emailContent = generateVerificationEmail(code, magicLinkUrl);
      await sendEmail({
        to: pendingEmail,
        ...emailContent,
      });

      return data(
        { email: pendingEmail, success: "New code sent!" },
        { headers: { "Set-Cookie": await commitSession(session) } }
      );
    } catch (error) {
      console.error("[RESEND ERROR]", error);
      session.flash("error", "Failed to resend code. Please try again.");
      return redirect("/verify", {
        headers: { "Set-Cookie": await commitSession(session) },
      });
    }
  }

  // Handle code verification
  const code = formData.get("code");

  if (typeof code !== "string" || code.length !== 6) {
    session.flash("error", "Please enter a valid 6-digit code");
    return redirect("/verify", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  }

  const isValid = await verifyCode(pendingEmail, code);

  if (!isValid) {
    session.flash("error", "Invalid or expired code. Please try again.");
    return redirect("/verify", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  }

  const user = await findOrCreateUser(pendingEmail);

  session.unset("pendingEmail");
  session.set("userId", user.id);
  session.set("userEmail", user.email);

  return redirect("/dashboard", {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}

export default function VerifyPage({ loaderData }: Route.ComponentProps) {
  const { email, error } = loaderData;
  const actionData = useActionData<{ success?: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleInputChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === 5 && newCode.every(d => d !== "")) {
      const form = inputRefs.current[0]?.closest("form");
      if (form) {
        setIsLoading(true);
        form.requestSubmit();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (pastedData.length === 6) {
      const newCode = pastedData.split("");
      setCode(newCode);
      inputRefs.current[5]?.focus();

      setTimeout(() => {
        const form = inputRefs.current[0]?.closest("form");
        if (form) {
          setIsLoading(true);
          form.requestSubmit();
        }
      }, 100);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>
            We sent a 6-digit code to <span className="font-medium text-gray-900">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-6" onSubmit={() => setIsLoading(true)}>
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {actionData?.success && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3">
                <p className="text-sm text-green-800">{actionData.success}</p>
              </div>
            )}

            <input type="hidden" name="code" value={code.join("")} />

            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold"
                />
              ))}
            </div>

            <Button
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
              disabled={isLoading || code.some(d => d === "")}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify Code
            </Button>
          </Form>

          <div className="mt-6 space-y-4">
            <div className="text-center">
              <Form method="post" className="inline">
                <input type="hidden" name="intent" value="resend" />
                <Button type="submit" variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                  Didn't receive the code? Resend
                </Button>
              </Form>
            </div>

            <div className="text-center">
              <Link to="/login" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Use a different email
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
