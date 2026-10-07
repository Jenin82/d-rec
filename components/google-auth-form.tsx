"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { BookOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient, safeReturnPath } from "@/lib/auth-client";

function oauthErrorMessage(code: string | null): string | null {
  if (!code) return null;
  if (code === "access_denied") return "Google sign-in was cancelled. Please try again when you’re ready.";
  if (code === "email_not_verified") return "Use a Google account with a verified email address.";
  if (code === "provider_not_found" || code === "GOOGLE_AUTH_NOT_CONFIGURED") {
    return "Google sign-in is not configured yet. Please contact your administrator.";
  }
  return "We couldn’t complete Google sign-in. Please try again.";
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="mr-2 h-4 w-4" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function GoogleAuthForm({ mode }: { mode: "login" | "signup" }) {
  const searchParams = useSearchParams();
  const returnPath = safeReturnPath(searchParams.get("redirect"));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isSignup = mode === "signup";
  const alternatePath = `${isSignup ? "/login" : "/signup"}?redirect=${encodeURIComponent(returnPath)}`;
  const displayError = error ?? oauthErrorMessage(searchParams.get("error"));

  async function handleGoogleSignIn() {
    setError(null);
    setIsLoading(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: returnPath,
        errorCallbackURL: `/login?redirect=${encodeURIComponent(returnPath)}`,
      });
      if (result.error) {
        setError(oauthErrorMessage(result.error.code ?? "unknown"));
        setIsLoading(false);
      }
    } catch {
      setError("We couldn’t connect to Google sign-in. Check your connection and try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-[radial-gradient(ellipse_at_top,oklch(0.95_0.04_200),oklch(0.98_0.01_200))] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.2_0.04_200),oklch(0.1_0.01_200))]">
        <div className="max-w-md text-center px-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <BookOpen className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">{isSignup ? "Join Digital Record" : "Digital Record"}</h2>
          <p className="mt-3 text-muted-foreground">Build. Code. Compile. Record.</p>
          <p className="mt-6 text-sm text-muted-foreground">
            Your complete academic platform for algorithm submission, coding practice, and digital record keeping.
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary lg:hidden">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">{isSignup ? "Create your account" : "Welcome back"}</CardTitle>
            <CardDescription>
              {isSignup ? "Get started with your digital lab record" : "Sign in to your Digital Record workspace"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-sm text-muted-foreground">
              {isSignup ? "Create your Digital Record account with Google." : "Use your Google account to sign in."}
              {" "}Google verifies your email, so there’s no separate password or email code.
            </p>
            {displayError && (
              <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {displayError}
              </div>
            )}
            <Button variant="outline" type="button" disabled={isLoading} onClick={handleGoogleSignIn} className="w-full h-10">
              <GoogleIcon />
              {isLoading ? "Connecting to Google..." : "Continue with Google"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {isSignup ? "Already have an account?" : "New to Digital Record?"}{" "}
              <Link href={alternatePath} className="text-primary underline underline-offset-2">
                {isSignup ? "Sign in" : "Create an account"}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
