"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerSchema } from "@/lib/validations/auth";
import {
  collectFieldErrors,
  type FieldErrors,
} from "@/lib/validations/field-errors";
import { postJson } from "@/lib/post-json";
import { AuthField } from "@/components/auth/AuthField";
import { FormError } from "@/components/auth/FormError";

type RegisterErrors = FieldErrors<
  "name" | "email" | "password" | "confirmPassword"
>;

export function RegisterForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const form = new FormData(event.currentTarget);
    const parsed = registerSchema.safeParse({
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      confirmPassword: form.get("confirmPassword"),
    });
    if (!parsed.success) {
      setErrors(collectFieldErrors(parsed.error));
      return;
    }

    setPending(true);
    const { ok, status, data } = await postJson<{ error?: string }>(
      "/api/auth/register",
      parsed.data,
    );
    setPending(false);

    if (ok) {
      router.push("/sign-in?registered=1");
      return;
    }
    setErrors({
      form:
        status === 0
          ? "Network error. Please try again."
          : (data?.error ?? "Could not create your account."),
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <AuthField id="name" label="Name" error={errors.name}>
        <Input id="name" name="name" autoComplete="name" required />
      </AuthField>
      <AuthField id="email" label="Email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </AuthField>
      <AuthField id="password" label="Password" error={errors.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </AuthField>
      <AuthField
        id="confirmPassword"
        label="Confirm password"
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

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-foreground underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
