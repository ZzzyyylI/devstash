"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GitHubIcon } from "@/components/auth/GitHubIcon";
import { signInSchema } from "@/lib/validations/auth";

interface SignInFormProps {
  /** Where to land after a successful sign-in. */
  callbackUrl: string;
}

export function SignInForm({ callbackUrl }: SignInFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );
  const [pending, setPending] = useState<"credentials" | "github" | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUnverifiedEmail(null);
    setResendState("idle");

    const form = new FormData(event.currentTarget);
    const parsed = signInSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      setError("Enter a valid email and password.");
      return;
    }

    setPending("credentials");
    const result = await signIn("credentials", {
      ...parsed.data,
      redirect: false,
    });
    setPending(null);

    if (result?.code === "unverified_email") {
      setUnverifiedEmail(parsed.data.email);
      return;
    }
    if (!result || result.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  async function resendVerification() {
    if (!unverifiedEmail) return;
    setResendState("sending");
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
    } catch {
      // Swallow — the endpoint is best-effort and always "succeeds" anyway.
    }
    setResendState("sent");
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {unverifiedEmail && (
          <div
            role="alert"
            className="space-y-2 rounded-md border border-border bg-muted/50 p-3 text-sm"
          >
            <p>
              Verify your email before signing in. We sent a link to{" "}
              <span className="font-medium">{unverifiedEmail}</span>.
            </p>
            {resendState === "sent" ? (
              <p className="text-muted-foreground">
                Sent — check your inbox (and spam).
              </p>
            ) : (
              <button
                type="button"
                onClick={resendVerification}
                disabled={resendState === "sending"}
                className="font-medium text-foreground underline disabled:opacity-50"
              >
                {resendState === "sending"
                  ? "Sending…"
                  : "Resend verification email"}
              </button>
            )}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={pending !== null}>
          {pending === "credentials" ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending !== null}
        onClick={() => {
          setPending("github");
          void signIn("github", { callbackUrl });
        }}
      >
        <GitHubIcon />
        {pending === "github" ? "Redirecting…" : "Sign in with GitHub"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-foreground underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
