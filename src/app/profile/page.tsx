import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BadgeCheck, Calendar } from "lucide-react";

import { auth } from "@/auth";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getProfileUser, getProfileStats } from "@/lib/db/profile";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { DeleteAccountDialog } from "@/components/profile/DeleteAccountDialog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profile · DevStash",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/profile");

  const [user, stats] = await Promise.all([
    getProfileUser(session.user.id),
    getProfileStats(session.user.id),
  ]);
  if (!user) redirect("/sign-in?callbackUrl=/profile");

  const memberSince = user.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      <div className="flex items-center gap-4">
        <UserAvatar
          name={user.name}
          image={user.image}
          className="size-16 text-lg"
        />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">
            {user.name ?? "Account"}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-muted-foreground">
          <Calendar className="size-3" />
          Joined {memberSince}
        </span>
        <span className="rounded-full border border-border px-2 py-0.5 font-medium">
          {user.isPro ? "Pro" : "Free"} plan
        </span>
        {user.emailVerified && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-muted-foreground">
            <BadgeCheck className="size-3" />
            Email verified
          </span>
        )}
      </div>

      <div className="mt-10">
        <ProfileStats stats={stats} />
      </div>

      <section className="mt-10 space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">Account</h2>

        {user.hasPassword && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-medium">Password</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Change the password you use to sign in.
            </p>
            <div className="mt-3">
              <ChangePasswordForm email={user.email} />
            </div>
          </div>
        )}

        <div className="rounded-xl border border-destructive/30 bg-card p-4">
          <p className="text-sm font-medium text-destructive">Delete account</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Permanently remove your account and everything stored in it.
          </p>
          <div className="mt-3">
            <DeleteAccountDialog email={user.email} />
          </div>
        </div>
      </section>
    </main>
  );
}
