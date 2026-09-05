"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePasswordSchema } from "@/lib/validations/auth";

type FieldErrors = Partial<
  Record<"currentPassword" | "newPassword" | "confirmPassword" | "form", string>
>;

/**
 * Collapsible "change password" control for the profile page. Only rendered for
 * email/password accounts (the profile page checks `hasPassword`). Posts to
 * `POST /api/auth/change-password`, which re-checks the current password.
 */
export function ChangePasswordForm({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setErrors({});

    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const values = {
      currentPassword: form.get("currentPassword"),
      newPassword: form.get("newPassword"),
      confirmPassword: form.get("confirmPassword"),
    };

    const parsed = changePasswordSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        fieldErrors[key] ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setPending(true);
    let res: Response;
    try {
      res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
    } catch {
      setPending(false);
      setErrors({ form: "Network error. Please try again." });
      return;
    }
    setPending(false);

    if (res.ok) {
      formEl.reset();
      setDone(true);
      setOpen(false);
      return;
    }

    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    setErrors({ form: body?.error ?? "Could not change your password." });
  }

  if (!open) {
    return (
      <div className="space-y-2">
        {done && (
          <p className="text-sm text-emerald-600 dark:text-emerald-500">
            Password updated.
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setDone(false);
            setOpen(true);
          }}
        >
          Change password
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm space-y-3">
      {/* Hidden username field: pairs with the password inputs so browsers
          associate the change with this account (and stops Chrome's stray
          "save password" heuristics on an SPA submit). */}
      <input
        type="text"
        name="username"
        autoComplete="username"
        value={email}
        readOnly
        hidden
      />
      <Field
        id="currentPassword"
        label="Current password"
        error={errors.currentPassword}
      >
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <Field id="newPassword" label="New password" error={errors.newPassword}>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>
      <Field
        id="confirmPassword"
        label="Confirm new password"
        error={errors.confirmPassword}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      {errors.form && (
        <p role="alert" className="text-sm text-destructive">
          {errors.form}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Update password"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            setErrors({});
            setOpen(false);
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
