import Link from "next/link";
import { BadgeCheck, Calendar } from "lucide-react";

import { UserAvatar } from "@/components/ui/user-avatar";
import { requireProfileUser, getProfileStats } from "@/lib/db/profile";
import { formatLongDate } from "@/lib/format-date";
import { ProfileStats } from "@/components/profile/ProfileStats";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profile · DevStash",
};

export default async function ProfilePage() {
  const user = await requireProfileUser("/profile");
  const stats = await getProfileStats(user.id);

  const memberSince = formatLongDate(user.createdAt);

  return (
    <div className="mx-auto max-w-2xl">
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

      <section className="mt-10">
        <h2 className="text-sm font-medium text-muted-foreground">Account</h2>
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">Account settings</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Change your password or delete your account.
          </p>
          <Link
            href="/settings"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:underline"
          >
            Go to settings
          </Link>
        </div>
      </section>
    </div>
  );
}
