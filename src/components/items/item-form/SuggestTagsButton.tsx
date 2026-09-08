"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { generateAutoTags } from "@/actions/ai";
import { Button } from "@/components/ui/button";

interface SuggestTagsButtonProps {
  /** Pro-only feature — the whole control is hidden for free users. */
  isPro: boolean;
  /** Current form values the model tags from. */
  title: string;
  content: string | null;
  /** Tags already on the item, so accepted/duplicate suggestions can be hidden. */
  existingTags: string[];
  /** Append an accepted suggestion to the form's tag list. */
  onAccept: (tag: string) => void;
}

/**
 * "Suggest tags" control for the create dialog and the drawer edit form. Calls
 * the `generateAutoTags` server action and renders each suggestion as a chip
 * with accept (✓) / reject (✕) buttons — accepted tags are pushed into the
 * form, nothing is written until the form itself is saved.
 *
 * Hidden entirely for non-Pro users (`generateAutoTags` also enforces this
 * server-side).
 */
export function SuggestTagsButton({
  isPro,
  title,
  content,
  existingTags,
  onAccept,
}: SuggestTagsButtonProps) {
  const [pending, setPending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  if (!isPro) return null;

  const existing = new Set(existingTags.map((tag) => tag.toLowerCase()));
  const visible = suggestions.filter((tag) => !existing.has(tag));

  async function handleSuggest() {
    if (pending) return;
    setPending(true);

    const result = await generateAutoTags({ title, content });

    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    if (result.data.tags.length === 0) {
      toast.info("No tag suggestions for this item yet.");
      return;
    }

    setSuggestions(result.data.tags);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start text-muted-foreground"
        disabled={pending || title.trim().length === 0}
        onClick={handleSuggest}
      >
        {pending ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Sparkles />
        )}
        {pending ? "Thinking…" : "Suggest tags"}
      </Button>

      {visible.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visible.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md border border-input py-0.5 pr-1 pl-2 text-xs"
            >
              {tag}
              <button
                type="button"
                aria-label={`Add tag ${tag}`}
                onClick={() => {
                  onAccept(tag);
                  setSuggestions((prev) => prev.filter((t) => t !== tag));
                }}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Check className="size-3" />
              </button>
              <button
                type="button"
                aria-label={`Dismiss tag ${tag}`}
                onClick={() =>
                  setSuggestions((prev) => prev.filter((t) => t !== tag))
                }
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
