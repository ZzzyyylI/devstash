import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers } from "lucide-react";

import { auth } from "@/auth";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata = {
  title: "Sign in · DevStash",
};

function safeCallbackUrl(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  // Only allow same-origin relative paths.
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);

  const session = await auth();
  if (session?.user) redirect(callbackUrl);

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
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your DevStash account
          </p>
        </div>

        <SignInForm callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}
