"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { forgotPasswordSchema } from "@/lib/validations/auth";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const parsed = forgotPasswordSchema.safeParse({ email: form.get("email") });
    if (!parsed.success) {
      setError("Enter a valid email address.");
      return;
    }

    setPending(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
    } catch {
      // Best-effort — the endpoint always "succeeds" anyway, so show the same
      // confirmation rather than a network error the user can't act on.
    }
    setPending(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-border bg-muted/50 p-3 text-sm">
          If an account exists for that email, we&apos;ve sent a link to reset
          your password. Check your inbox (and spam).
        </p>
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/sign-in"
            className="font-medium text-foreground underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
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

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/sign-in" className="font-medium text-foreground underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
