"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { generateItemDescription } from "@/actions/ai";
import { Button } from "@/components/ui/button";

interface DescribeButtonProps {
  /** Pro-only feature — the whole control is hidden for free users. */
  isPro: boolean;
  /** Current form values the model drafts from. */
  type: string;
  title: string;
  content: string | null;
  url: string | null;
  language: string | null;
  description: string;
  /** Replace the form's Description field with the drafted text. */
  onGenerate: (description: string) => void;
}

/**
 * "Describe" control for the create dialog and the drawer edit form. Lives in
 * the Description field's label row (so it clearly acts on that field), calls
 * the `generateItemDescription` server action with whatever the form currently
 * holds — no save needed — and drops the 1-2 sentence result into Description.
 *
 * Hidden entirely for non-Pro users (`generateItemDescription` also enforces
 * this server-side).
 */
export function DescribeButton({
  isPro,
  type,
  title,
  content,
  url,
  language,
  description,
  onGenerate,
}: DescribeButtonProps) {
  const [pending, setPending] = useState(false);

  if (!isPro) return null;

  async function handleClick() {
    if (pending) return;
    setPending(true);

    const result = await generateItemDescription({
      type,
      title,
      content,
      url,
      language,
      description,
    });

    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    onGenerate(result.data.description);
    toast.success("Description drafted");
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-my-1 h-7 gap-1 px-2 text-muted-foreground"
      disabled={pending || title.trim().length === 0}
      onClick={handleClick}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
      {pending ? "Describing…" : "Describe"}
    </Button>
  );
}
