"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Folder } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Fixed top navigation. Turns opaque + gains a border once the page scrolls. */
export function HomeNav({ signedIn }: { signedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-16 border-b backdrop-blur transition-colors duration-300",
        scrolled
          ? "border-border bg-background/90"
          : "border-transparent bg-background/40",
      )}
    >
      <nav className="mx-auto flex h-full max-w-6xl items-center gap-6 px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-extrabold tracking-tight"
        >
          <Folder className="size-5 text-[#3b82f6]" />
          <span>DevStash</span>
        </Link>

        <div className="ml-2 hidden gap-6 text-sm text-muted-foreground sm:flex">
          <Link
            href="/#features"
            className="transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="/#pricing"
            className="transition-colors hover:text-foreground"
          >
            Pricing
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {signedIn ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
