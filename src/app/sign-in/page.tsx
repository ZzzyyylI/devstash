import Link from "next/link";
import { redirect } from "next/navigation";
import { Folder } from "lucide-react";

import { auth } from "@/auth";
import { SignInForm } from "@/components/auth/SignInForm";
import { HomeNav } from "@/components/home/HomeNav";
import { emailVerificationEnabled } from "@/lib/auth-flags";

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

function firstParam(raw: string | string[] | undefined) {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);

  const session = await auth();
  if (session?.user) redirect(callbackUrl);

  let notice: { tone: "info" | "error"; text: string } | null = null;
  if (firstParam(params.reset)) {
    notice = {
      tone: "info",
      text: "Password updated — sign in with your new password.",
    };
  } else if (firstParam(params.verified)) {
    notice = { tone: "info", text: "Email verified — you can sign in now." };
  } else if (firstParam(params.registered)) {
    notice = {
      tone: "info",
      text: emailVerificationEnabled()
        ? "Check your email for a verification link to activate your account."
        : "Your account is ready — sign in below.",
    };
  } else if (firstParam(params.error) === "verification") {
    notice = {
      tone: "error",
      text: "That verification link is invalid or has expired. Sign in to request a new one.",
    };
  }

  return (
    <>
      <HomeNav signedIn={false} />
      <main className="flex min-h-screen items-center justify-center p-6 pt-24">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <Link
              href="/"
              className="flex items-center gap-2 font-extrabold tracking-tight"
            >
              <Folder className="size-5 text-[#3b82f6]" />
              <span>DevStash</span>
            </Link>
            <h1 className="text-xl font-semibold">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your DevStash account
            </p>
          </div>

          {notice && (
            <p
              className={
                notice.tone === "error"
                  ? "rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                  : "rounded-md border border-border bg-muted/50 p-3 text-sm"
              }
            >
              {notice.text}
            </p>
          )}

          <SignInForm callbackUrl={callbackUrl} />
        </div>
      </main>
    </>
  );
}
