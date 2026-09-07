"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetPasswordSchema } from "@/lib/validations/auth";
import {
  collectFieldErrors,
  type FieldErrors,
} from "@/lib/validations/field-errors";
import { postJson } from "@/lib/post-json";

type ResetErrors = FieldErrors<"password" | "confirmPassword">;

const RESET_FIELDS = ["password", "confirmPassword"] as const;

interface ResetPasswordFormProps {
  /** The reset token from the email link's `?token=` query param. */
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<ResetErrors>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const form = new FormData(event.currentTarget);
    const parsed = resetPasswordSchema.safeParse({
      token,
      password: form.get("password"),
      confirmPassword: form.get("confirmPassword"),
    });
    if (!parsed.success) {
      setErrors(collectFieldErrors(parsed.error, RESET_FIELDS));
      return;
    }

    setPending(true);
    const { ok, status, data } = await postJson<{ error?: string }>(
      "/api/auth/reset-password",
      parsed.data,
    );
    setPending(false);

    if (ok) {
      router.push("/sign-in?reset=1");
      return;
    }
    setErrors({
      form:
        status === 0
          ? "Network error. Please try again."
          : (data?.error ?? "Could not reset your password."),
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          New password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword}</p>
        )}
      </div>

      {errors.form && (
        <div
          role="alert"
          className="space-y-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <p>{errors.form}</p>
          <Link
            href="/forgot-password"
            className="inline-block font-medium underline"
          >
            Request a new reset link
          </Link>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Update password"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/sign-in" className="font-medium text-foreground underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
