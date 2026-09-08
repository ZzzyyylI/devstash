import { requireProfileUser } from "@/lib/db/profile";
import { getEditorPreferences } from "@/lib/db/editor-preferences";
import { BillingCheckoutToast } from "@/components/settings/BillingCheckoutToast";
import { BillingSection } from "@/components/settings/BillingSection";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { EditorPreferencesForm } from "@/components/settings/EditorPreferencesForm";
import { EditorPreferencesProvider } from "@/components/editor-preferences/EditorPreferencesProvider";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings · DevStash",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string | string[] }>;
}) {
  const user = await requireProfileUser("/settings");
  const editorPreferences = await getEditorPreferences(user.id);

  const rawCheckout = (await searchParams).checkout;
  const checkoutParam = Array.isArray(rawCheckout) ? rawCheckout[0] : rawCheckout;
  const checkoutStatus =
    checkoutParam === "success" || checkoutParam === "cancelled"
      ? checkoutParam
      : null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {checkoutStatus && <BillingCheckoutToast status={checkoutStatus} />}

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
        <h2 className="text-sm font-medium text-muted-foreground">
          Plan &amp; billing
        </h2>

        <BillingSection
          isPro={user.isPro}
          hasCustomer={user.hasStripeCustomer}
        />
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
    </div>
  );
}
