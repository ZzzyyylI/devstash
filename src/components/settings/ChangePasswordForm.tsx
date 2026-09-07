"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePasswordSchema } from "@/lib/validations/auth";
import {
  collectFieldErrors,
  type FieldErrors,
} from "@/lib/validations/field-errors";
import { postJson } from "@/lib/post-json";
import { AuthField } from "@/components/auth/AuthField";
import { FormError } from "@/components/auth/FormError";

type ChangePasswordErrors = FieldErrors<
  "currentPassword" | "newPassword" | "confirmPassword"
>;

/**
 * Collapsible "change password" control for the settings page. Only rendered for
 * email/password accounts (the settings page checks `hasPassword`). Posts to
 * `POST /api/auth/change-password`, which re-checks the current password.
 */
export function ChangePasswordForm({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<ChangePasswordErrors>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setErrors({});

    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const parsed = changePasswordSchema.safeParse({
      currentPassword: form.get("currentPassword"),
      newPassword: form.get("newPassword"),
      confirmPassword: form.get("confirmPassword"),
    });
    if (!parsed.success) {
      setErrors(collectFieldErrors(parsed.error));
      return;
    }

    setPending(true);
    const { ok, status, data } = await postJson<{ error?: string }>(
      "/api/auth/change-password",
      parsed.data,
    );
    setPending(false);

    if (ok) {
      formEl.reset();
      setDone(true);
      setOpen(false);
      return;
    }
    setErrors({
      form:
        status === 0
          ? "Network error. Please try again."
          : (data?.error ?? "Could not change your password."),
    });
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
      <AuthField
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
      </AuthField>
      <AuthField id="newPassword" label="New password" error={errors.newPassword}>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </AuthField>
      <AuthField
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
      </AuthField>

      <FormError>{errors.form}</FormError>

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
