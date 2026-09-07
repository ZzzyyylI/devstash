import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireProfileUser } from "@/lib/db/profile";
import { getEditorPreferences } from "@/lib/db/editor-preferences";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { EditorPreferencesForm } from "@/components/settings/EditorPreferencesForm";
import { EditorPreferencesProvider } from "@/components/editor-preferences/EditorPreferencesProvider";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings · DevStash",
};

export default async function SettingsPage() {
  const user = await requireProfileUser("/settings");
  const editorPreferences = await getEditorPreferences(user.id);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      <h1 className="text-xl font-semibold">Settings</h1>

      <section className="mt-8 space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Editor preferences
        </h2>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">Code editor</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Applied to every Monaco code editor across DevStash. Changes save
            automatically.
          </p>
          <div className="mt-3">
            <EditorPreferencesProvider initial={editorPreferences}>
              <EditorPreferencesForm />
            </EditorPreferencesProvider>
          </div>
        </div>
      </section>

      <section className="mt-8 space-y-4">
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
