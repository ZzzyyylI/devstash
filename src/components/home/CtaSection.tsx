import Link from "next/link";

import { Button } from "@/components/ui/button";

import { Reveal } from "./Reveal";

export function CtaSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <div className="rounded-2xl border-y border-border bg-gradient-to-b from-[#6366f1]/10 to-transparent px-6 py-16 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready to Organize Your Knowledge?
          </h2>
          <p className="mx-auto mt-3 max-w-[46ch] text-muted-foreground">
            One searchable home for snippets, prompts, commands and everything
            else.
          </p>
          <Button asChild size="lg" className="mt-7 h-11 px-6 text-base">
            <Link href="/register">Create your stash</Link>
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
