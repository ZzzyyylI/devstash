import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers } from "lucide-react";

import { auth } from "@/auth";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Set a new password · DevStash",
};

function firstParam(raw: string | string[] | undefined) {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const params = await searchParams;
  const token = firstParam(params.token);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link
            href="/"
            className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          >
            <Layers className="size-5" />
          </Link>
          <h1 className="text-xl font-semibold">Set a new password</h1>
          <p className="text-sm text-muted-foreground">
            Choose a new password for your DevStash account
          </p>
        </div>

        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="space-y-4">
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              This reset link is missing its token. Request a new one.
            </p>
            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/forgot-password"
                className="font-medium text-foreground underline"
              >
                Request a new reset link
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
