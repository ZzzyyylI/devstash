import Link from "next/link";

import { Button } from "@/components/ui/button";

import { ChaosOrderFlow } from "./ChaosOrderFlow";
import { Reveal } from "./Reveal";

/** Above-the-fold: status pill, headline, sub-copy, CTAs, chaos → order visual. */
export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24 pt-[8.5rem] text-center">
      <Reveal>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-[#22c55e] shadow-[0_0_0_4px_rgba(34,197,94,0.18)]" />
          One hub for everything you know
        </span>

        <h1 className="mx-auto mt-6 max-w-[15ch] text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          Stop Losing Your{" "}
          <span className="bg-gradient-to-r from-[#3b82f6] via-[#6366f1] to-[#ec4899] bg-clip-text text-transparent">
            Developer Knowledge
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-[56ch] text-base text-muted-foreground sm:text-lg">
          Snippets in your editor. Prompts in a chat log. Commands in a text
          file. Docs in a random folder. DevStash pulls it all into one
          searchable, AI-enhanced home.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3.5">
          <Button asChild size="lg" className="h-11 px-6 text-base">
            <Link href={signedIn ? "/dashboard" : "/register"}>
              {signedIn ? "Go to dashboard" : "Start for Free"}
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-11 px-6 text-base"
          >
            <a href="#features">See Features</a>
          </Button>
        </div>
      </Reveal>

      <Reveal>
        <ChaosOrderFlow />
      </Reveal>
    </section>
  );
}
