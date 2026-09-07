import { FEATURES } from "@/lib/home-content";

import { FeatureCard } from "./FeatureCard";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24"
    >
      <Reveal>
        <SectionHeading
          title="Everything a developer keeps, in one place"
          subtitle="Seven built-in types, mixed collections, and full-text search over all of it."
        />
      </Reveal>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <Reveal key={feature.title} className="h-full">
            <FeatureCard feature={feature} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
