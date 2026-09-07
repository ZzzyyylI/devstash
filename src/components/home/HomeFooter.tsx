import Link from "next/link";

import { FOOTER_COLUMNS, copyrightYears } from "@/lib/home-content";

export function HomeFooter() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-6 pt-16 pb-10">
      <div className="flex flex-wrap justify-between gap-10">
        <div>
          <Link
            href="/"
            className="flex items-center gap-2 font-extrabold tracking-tight"
          >
            <span className="font-mono text-[#3b82f6]">&lt;/&gt;</span>
            <span>DevStash</span>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            Store smarter. Build faster.
          </p>
        </div>

        <div className="flex flex-wrap gap-14">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.heading} className="flex flex-col gap-2">
              <h4 className="mb-0.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {column.heading}
              </h4>
              {column.links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-12 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        © {copyrightYears()} DevStash. All rights reserved.
      </p>
    </footer>
  );
}
