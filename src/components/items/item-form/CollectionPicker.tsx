"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { CollectionOption } from "@/lib/db/collections";
import { Field } from "@/components/items/item-form/Field";

/**
 * Multi-select "Collections" field for the New Item dialog and the drawer's
 * edit form. Renders one toggle pill per collection (same visual pattern as the
 * dialog's Type selector) and fetches the option list from `GET /api/collections`
 * on mount so callers don't have to thread it through.
 */
export function CollectionPicker({
  selected,
  onChange,
  disabled,
  error,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  error?: string[];
}) {
  const [options, setOptions] = useState<CollectionOption[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/collections")
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { data: CollectionOption[] };
        return body.data;
      })
      .then((data) => {
        if (active) setOptions(data);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
    );
  }

  return (
    <Field label="Collections" hint="Optional" error={error}>
      {loadError ? (
        <p className="text-xs text-muted-foreground">
          Couldn&apos;t load your collections.
        </p>
      ) : options === null ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : options.length === 0 ? (
        <p className="text-xs text-muted-foreground">No collections yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {options.map((option) => {
            const active = selected.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggle(option.id)}
                disabled={disabled}
                aria-pressed={active}
                className={cn(
                  "cursor-pointer rounded-md border px-2.5 py-1 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-input text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {option.name}
              </button>
            );
          })}
        </div>
      )}
    </Field>
  );
}
