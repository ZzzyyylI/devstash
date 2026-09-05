import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { UserAvatar } from "@/components/ui/user-avatar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profile · DevStash",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/profile");

  const { name, email, image } = session.user;

  return (
    <main className="mx-auto max-w-lg p-6">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      <div className="flex items-center gap-4">
        <UserAvatar name={name} image={image} className="size-16 text-lg" />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{name ?? "Account"}</h1>
          {email && (
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          )}
        </div>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Profile settings are coming soon.
      </p>
    </main>
  );
}
