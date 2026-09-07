import { PricingPlans } from "./PricingPlans";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24"
    >
      <Reveal>
        <SectionHeading
          title="Simple pricing"
          subtitle="Start free. Upgrade when your stash outgrows it."
        />
      </Reveal>
      <Reveal>
        <PricingPlans />
      </Reveal>
    </section>
  );
}
