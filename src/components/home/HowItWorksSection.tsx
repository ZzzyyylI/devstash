import { HOW_STEPS } from "@/lib/home-content";
import { cn } from "@/lib/utils";

import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const STEP_BADGE = [
  "border-[#3b82f6]/35 bg-[#3b82f6]/15 text-[#3b82f6]",
  "border-[#22c55e]/35 bg-[#22c55e]/15 text-[#22c55e]",
  "border-[#6366f1]/35 bg-[#6366f1]/15 text-[#6366f1]",
];

const STAGES = [
  { label: "Capture", body: "⌘V  →  useDebounce.ts saved", accent: "border-l-[#3b82f6]" },
  {
    label: "Organize",
    body: "# React Patterns  ·  + add to collection",
    accent: "border-l-[#22c55e]",
  },
  { label: "Recall", body: "⌘K  debounce ▸ useDebounce.ts", accent: "border-l-[#6366f1]" },
];

export function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <SectionHeading
          title="From scattered to searchable in three steps"
          subtitle="No setup ritual — paste something in and it’s already findable."
        />
      </Reveal>

      <Reveal>
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <ol className="grid gap-6">
            {HOW_STEPS.map((step, i) => (
              <li key={step.title} className="relative pl-16">
                <span
                  className={cn(
                    "absolute top-0.5 left-0 grid size-10 place-items-center rounded-xl border text-base font-extrabold",
                    STEP_BADGE[i],
                  )}
                >
                  {i + 1}
                </span>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.blurb}</p>
              </li>
            ))}
          </ol>

          <div
            aria-hidden
            className="grid gap-3 rounded-xl border border-border bg-card/60 p-4 font-mono shadow-xl"
          >
            {STAGES.map((stage) => (
              <div
                key={stage.label}
                className={cn(
                  "rounded-lg border border-border border-l-[3px] bg-muted/30 px-3.5 py-3 text-xs text-muted-foreground",
                  stage.accent,
                )}
              >
                <b className="mb-1 block text-[0.68rem] font-bold tracking-wider text-foreground uppercase">
                  {stage.label}
                </b>
                {stage.body}
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
