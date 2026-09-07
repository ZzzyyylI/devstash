"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Delete-account action guarded by a confirmation dialog: the user has to type
 * their own email address before the button enables. On success it clears the
 * session and sends them to the sign-in page.
 */
export function DeleteAccountDialog({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = value.trim().toLowerCase() === email.toLowerCase();

  async function handleDelete() {
    setError(null);
    setPending(true);

    let res: Response;
    try {
      res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: value }),
      });
    } catch {
      setPending(false);
      setError("Network error. Please try again.");
      return;
    }

    if (!res.ok) {
      setPending(false);
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Could not delete your account.");
      return;
    }

    await signOut({ redirect: false });
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setValue("");
        setError(null);
      }}
    >
      <Dialog.Trigger asChild>
        <Button variant="destructive" size="sm">
          Delete account
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-lg outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:fade-in">
          <Dialog.Title className="text-lg font-semibold">
            Delete account
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            This permanently deletes your account along with all of your items,
            collections, and tags. This cannot be undone.
          </Dialog.Description>

          <div className="mt-4 space-y-1.5">
            <label htmlFor="confirm-delete" className="text-sm font-medium">
              Type <span className="font-mono text-foreground">{email}</span> to
              confirm
            </label>
            <Input
              id="confirm-delete"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm" disabled={pending}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              variant="destructive"
              size="sm"
              disabled={!confirmed || pending}
              onClick={handleDelete}
            >
              {pending ? "Deleting…" : "Delete account"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
