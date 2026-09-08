import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";

import { auth } from "@/auth";
import { UpgradePlan } from "@/components/upgrade/UpgradePlan";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Upgrade to Pro · DevStash",
};

/**
 * Upgrade landing page. Free users reach it from the ghost "Upgrade" button in
 * the dashboard header, or by trying to browse a Pro-only item type. Signed-out
 * visitors are bounced to sign-in; users already on Pro go to `/settings`.
 */
export default async function UpgradePage() {
  const session = await auth();

  if (!session?.user) redirect("/sign-in?callbackUrl=/upgrade");
  if (session.user.isPro) redirect("/settings");

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      <div className="flex flex-col items-center text-center">
        <div className="flex size-12 items-center justify-center rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/15">
          <Sparkles className="size-5 text-[#f59e0b]" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">Upgrade to DevStash Pro</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Unlimited items and collections, file uploads, custom types, AI
          features and export. Cancel anytime.
        </p>
      </div>

      <div className="mt-8">
        <UpgradePlan />
      </div>
    </main>
  );
}
