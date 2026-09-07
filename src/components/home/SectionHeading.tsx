interface SectionHeadingProps {
  title: string;
  subtitle: string;
}

/** Centered section title + lead, matching the prototype's `.section__head`. */
export function SectionHeading({ title, subtitle }: SectionHeadingProps) {
  return (
    <div className="mx-auto mb-14 max-w-[60ch] text-center">
      <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-muted-foreground">{subtitle}</p>
    </div>
  );
}
