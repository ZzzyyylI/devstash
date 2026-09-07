/**
 * Single source of truth for the marketing homepage (`/`).
 *
 * Plain data + types only — no JSX. The Tailwind colour classes are written as
 * literal arbitrary-value strings (`text-[#3b82f6]`, `border-t-[#3b82f6]`, …) so
 * the JIT compiler picks them up; never build these class names dynamically.
 */
import {
  Code2,
  FileText,
  Layers,
  Search,
  Sparkles,
  SquareTerminal,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ item types */

export interface ItemTypeMeta {
  /** Display name, and the key used by {@link itemType}. */
  name: string;
  /** Prototype accent hex. */
  hex: string;
  /** `text-*` colour class for icons/labels. */
  icon: string;
  /** Faint `bg-*` tint for icon chips. */
  iconBg: string;
  /** `border-t-*` colour class for card top accents. */
  topBorder: string;
  /** Solid `bg-*` class for dots / swatches. */
  swatch: string;
}

export const ITEM_TYPES: ItemTypeMeta[] = [
  {
    name: "Snippet",
    hex: "#3b82f6",
    icon: "text-[#3b82f6]",
    iconBg: "bg-[#3b82f6]/15",
    topBorder: "border-t-[#3b82f6]",
    swatch: "bg-[#3b82f6]",
  },
  {
    name: "Prompt",
    hex: "#f59e0b",
    icon: "text-[#f59e0b]",
    iconBg: "bg-[#f59e0b]/15",
    topBorder: "border-t-[#f59e0b]",
    swatch: "bg-[#f59e0b]",
  },
  {
    name: "Command",
    hex: "#06b6d4",
    icon: "text-[#06b6d4]",
    iconBg: "bg-[#06b6d4]/15",
    topBorder: "border-t-[#06b6d4]",
    swatch: "bg-[#06b6d4]",
  },
  {
    name: "Note",
    hex: "#22c55e",
    icon: "text-[#22c55e]",
    iconBg: "bg-[#22c55e]/15",
    topBorder: "border-t-[#22c55e]",
    swatch: "bg-[#22c55e]",
  },
  {
    name: "File",
    hex: "#64748b",
    icon: "text-[#64748b]",
    iconBg: "bg-[#64748b]/15",
    topBorder: "border-t-[#64748b]",
    swatch: "bg-[#64748b]",
  },
  {
    name: "Image",
    hex: "#ec4899",
    icon: "text-[#ec4899]",
    iconBg: "bg-[#ec4899]/15",
    topBorder: "border-t-[#ec4899]",
    swatch: "bg-[#ec4899]",
  },
  {
    name: "URL",
    hex: "#6366f1",
    icon: "text-[#6366f1]",
    iconBg: "bg-[#6366f1]/15",
    topBorder: "border-t-[#6366f1]",
    swatch: "bg-[#6366f1]",
  },
];

const ITEM_TYPE_BY_NAME: Record<string, ItemTypeMeta> = Object.fromEntries(
  ITEM_TYPES.map((t) => [t.name, t]),
);

/** Look up an item-type's presentation by name (falls back to the first type). */
export function itemType(name: string): ItemTypeMeta {
  return ITEM_TYPE_BY_NAME[name] ?? ITEM_TYPES[0];
}

/** The nine cards in the hero's dashboard preview, by item-type name. */
export const PREVIEW_CARD_TYPES: string[] = [
  "Snippet",
  "Prompt",
  "Command",
  "Note",
  "File",
  "Image",
  "URL",
  "Snippet",
  "Prompt",
];

/* --------------------------------------------------------------------- features */

export interface Feature {
  title: string;
  blurb: string;
  /** Name of the {@link ITEM_TYPES} entry supplying this card's accent colour. */
  typeName: string;
  icon: LucideIcon;
}

export const FEATURES: Feature[] = [
  {
    title: "Code Snippets",
    typeName: "Snippet",
    icon: Code2,
    blurb:
      "Save reusable functions and patterns with syntax highlighting and language tags.",
  },
  {
    title: "AI Prompts",
    typeName: "Prompt",
    icon: Sparkles,
    blurb:
      "Keep your best prompts and workflows versioned instead of buried in chat history.",
  },
  {
    title: "Instant Search",
    typeName: "URL",
    icon: Search,
    blurb:
      "Full-text search across content, titles, tags and types. Command palette on ⌘K.",
  },
  {
    title: "Commands",
    typeName: "Command",
    icon: SquareTerminal,
    blurb:
      "Stop digging through bash history. Store shell one-liners with notes on what they do.",
  },
  {
    title: "Files & Docs",
    typeName: "File",
    icon: FileText,
    blurb:
      "Upload templates, context files and images. Markdown editor for everything text.",
  },
  {
    title: "Collections",
    typeName: "Note",
    icon: Layers,
    blurb:
      "Group mixed item types — React Patterns, Context Files, Python Snippets — your way.",
  },
];

/* --------------------------------------------------------------------------- AI */

export const AI_CAPABILITIES: string[] = [
  "Auto-tagging from content",
  "One-line AI summaries",
  "Explain Code in plain English",
  "Prompt optimization suggestions",
];

/* -------------------------------------------------------------------- how it works */

export interface HowStep {
  title: string;
  blurb: string;
}

export const HOW_STEPS: HowStep[] = [
  {
    title: "Capture anything",
    blurb:
      "Paste a snippet, prompt, command or link — or drop in a file. Markdown editor built in.",
  },
  {
    title: "Organize into collections",
    blurb:
      "Tag it and file it under mixed collections like React Patterns or Context Files.",
  },
  {
    title: "Recall with ⌘K",
    blurb:
      "Full-text search across content, titles, tags and types from anywhere in the app.",
  },
];

/* ---------------------------------------------------------------------- pricing */

export interface PricePoint {
  amount: string;
  cycle: string;
  period: string;
}

/** Values mirror `prototypes/homepage/script.js` `PRICES`. */
export const PRICING: Record<"monthly" | "yearly", PricePoint> = {
  monthly: { amount: "$8", cycle: "/mo", period: "billed monthly" },
  yearly: { amount: "$72", cycle: "/yr", period: "billed yearly ($6/mo)" },
};

export const FREE_FEATURES: string[] = [
  "Up to 50 items",
  "3 collections",
  "Full-text search",
  "Image uploads",
  "Markdown editor & dark mode",
];

export const PRO_FEATURES: string[] = [
  "Unlimited items & collections",
  "File uploads & custom types",
  "AI tagging, summaries & Explain Code",
  "Prompt optimization",
  "Export to JSON / ZIP",
];

/* ----------------------------------------------------------------------- footer */

export interface FooterColumn {
  heading: string;
  links: { label: string; href: string }[];
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "AI", href: "#ai" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Docs", href: "#" },
      { label: "Changelog", href: "#" },
      { label: "Roadmap", href: "#" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
];

/** Year DevStash first shipped — the fixed lower bound of the footer copyright range. */
export const COPYRIGHT_START_YEAR = 2026;

/**
 * Footer copyright span: just the start year until the calendar moves past it,
 * then `2026–<current>`. Kept as a helper so the rendered string is a pure
 * function of `now` (testable, no bare `new Date()` scattered in the view).
 */
export function copyrightYears(now: Date = new Date()): string {
  const year = now.getFullYear();
  return year > COPYRIGHT_START_YEAR
    ? `${COPYRIGHT_START_YEAR}–${year}`
    : String(COPYRIGHT_START_YEAR);
}

/* ------------------------------------------------------------------ chaos field */

/** Labels for the eight scattered-tool icons in the hero "chaos" panel. */
export const CHAOS_SOURCES: string[] = [
  "Notion",
  "GitHub",
  "Slack",
  "VS Code",
  "Browser tabs",
  "Terminal",
  "Text file",
  "Bookmark",
];
