import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AI_CAPABILITIES } from "@/lib/home-content";

import { Reveal } from "./Reveal";

export function AiSection() {
  return (
    <section id="ai" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <Badge
            variant="outline"
            className="border-[#f59e0b]/40 bg-[#f59e0b]/15 tracking-wide text-[#f59e0b] uppercase"
          >
            Pro Feature
          </Badge>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Let AI do the filing
          </h2>
          <p className="mt-3 text-muted-foreground">
            DevStash Pro reads your content and does the tedious parts for you —
            powered by OpenAI.
          </p>
          <ul className="my-6 grid gap-3">
            {AI_CAPABILITIES.map((capability) => (
              <li key={capability} className="flex items-center gap-3">
                <span className="grid size-5 shrink-0 place-items-center rounded-full border border-[#22c55e] bg-[#22c55e]/20 text-[#22c55e]">
                  <Check className="size-3" />
                </span>
                {capability}
              </li>
            ))}
          </ul>
          <Button asChild>
            <a href="#pricing">Unlock AI features</a>
          </Button>
        </Reveal>

        <Reveal>
          <AiEditorMock />
        </Reveal>
      </div>
    </section>
  );
}

const AI_TAGS = [
  "typescript",
  "utility",
  "performance",
  "higher-order-function",
  "timing",
];

/** Static editor mock — a `debounce.ts` file with AI-generated tags below. */
function AiEditorMock() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[#0d0f15] font-mono shadow-xl">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-3.5 py-2.5">
        <span className="size-2.5 rounded-full bg-[#f87171]" />
        <span className="size-2.5 rounded-full bg-[#fbbf24]" />
        <span className="size-2.5 rounded-full bg-[#34d399]" />
        <span className="ml-2 text-xs text-muted-foreground">debounce.ts</span>
      </div>

      <pre className="overflow-x-auto p-4 text-[0.8rem] leading-relaxed text-[#c7cbd6]">
        <code>
          <span className="text-[#c084fc]">export function</span>{" "}
          <span className="text-[#60a5fa]">debounce</span>
          {"<T "}
          <span className="text-[#c084fc]">extends</span>
          {" unknown[]>(\n  "}
          <span className="text-[#f0abfc]">fn</span>
          {": (...args: T) => "}
          <span className="text-[#2dd4bf]">void</span>
          {",\n  "}
          <span className="text-[#f0abfc]">wait</span>
          {": "}
          <span className="text-[#2dd4bf]">number</span>
          {",\n) {\n  "}
          <span className="text-[#c084fc]">let</span>
          {" t: ReturnType<"}
          <span className="text-[#c084fc]">typeof</span>
          {" setTimeout>;\n  "}
          <span className="text-[#c084fc]">return</span>
          {" (...args: T) => {\n    "}
          <span className="text-[#60a5fa]">clearTimeout</span>
          {"(t);\n    t = "}
          <span className="text-[#60a5fa]">setTimeout</span>
          {"(() => "}
          <span className="text-[#60a5fa]">fn</span>
          {"(...args), wait);\n  };\n}"}
        </code>
      </pre>

      <div className="border-t border-dashed border-border bg-[#f59e0b]/5 px-4 pt-3.5 pb-4">
        <span className="text-[0.72rem] tracking-wider text-[#f59e0b] uppercase">
          AI Generated Tags
        </span>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {AI_TAGS.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="font-mono font-normal text-muted-foreground"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
