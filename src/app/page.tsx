import type { Metadata } from "next";

import { auth } from "@/auth";
import { AiSection } from "@/components/home/AiSection";
import { CtaSection } from "@/components/home/CtaSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { Hero } from "@/components/home/Hero";
import { HomeFooter } from "@/components/home/HomeFooter";
import { HomeNav } from "@/components/home/HomeNav";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { PricingSection } from "@/components/home/PricingSection";

export const metadata: Metadata = {
  title: "DevStash — Stop Losing Your Developer Knowledge",
  description:
    "DevStash is one searchable, AI-enhanced hub for your code snippets, AI prompts, commands, notes, files, images and links.",
};

export default async function HomePage() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      {/* ambient background glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(60%_45%_at_15%_0%,rgba(59,130,246,0.14),transparent_70%),radial-gradient(55%_45%_at_90%_8%,rgba(99,102,241,0.12),transparent_70%),radial-gradient(45%_40%_at_50%_100%,rgba(236,72,153,0.07),transparent_70%)]"
      />

      <HomeNav signedIn={signedIn} />

      <main className="flex-1">
        <Hero signedIn={signedIn} />
        <FeaturesSection />
        <AiSection />
        <HowItWorksSection />
        <PricingSection signedIn={signedIn} />
        <CtaSection />
      </main>

      <HomeFooter />
    </div>
  );
}
