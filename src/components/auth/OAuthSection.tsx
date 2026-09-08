"use client";

import { useState } from "react";

import { signInWithGitHub } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { GitHubIcon } from "@/components/auth/GitHubIcon";

interface OAuthSectionProps {
  /** Button label, e.g. "Sign in with GitHub" or "Sign up with GitHub". */
  label: string;
  /** Where to land after GitHub auth completes. */
  callbackUrl?: string;
  /** Disable while a sibling form (e.g. credentials sign-in) is submitting. */
  disabled?: boolean;
}

/**
 * The "or" divider + GitHub OAuth button shared by the sign-in and register
 * forms. GitHub account linking is entry-point-agnostic, so the same flow works
 * for both — only the label differs.
 */
export function OAuthSection({
  label,
  callbackUrl = "/dashboard",
  disabled = false,
}: OAuthSectionProps) {
  const [redirecting, setRedirecting] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={disabled || redirecting}
        onClick={() => {
          setRedirecting(true);
          void signInWithGitHub(callbackUrl);
        }}
      >
        <GitHubIcon />
        {redirecting ? "Redirecting…" : label}
      </Button>
    </>
  );
}
