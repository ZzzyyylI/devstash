import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers } from "lucide-react";

import { auth } from "@/auth";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Forgot password · DevStash",
};

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

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
          <h1 className="text-xl font-semibold">Reset your password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <ForgotPasswordForm />
      </div>
    </main>
  );
}
