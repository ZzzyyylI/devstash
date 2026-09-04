import {
  Code,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles,
  Terminal,
  type LucideIcon,
} from "lucide-react";

import { mockItemTypes } from "@/lib/mock-data";

/** Item type id -> lucide icon. Mirrors the sidebar's type presentation. */
export const TYPE_ICON: Record<string, LucideIcon> = {
  type_snippet: Code,
  type_prompt: Sparkles,
  type_command: Terminal,
  type_note: FileText,
  type_file: FileIcon,
  type_image: ImageIcon,
  type_link: LinkIcon,
};

/** Icon to fall back to when a type id is unknown. */
export const FALLBACK_ICON: LucideIcon = FileText;

interface PaletteEntry {
  /** text-* colour class */
  text: string;
  /** border-l-* colour class for card accents */
  border: string;
}

/** Hex colours -> Tailwind classes (no inline styles per coding standards). */
const PALETTE: Record<string, PaletteEntry> = {
  // Mock data set (src/lib/mock-data.ts).
  "#3b82f6": { text: "text-blue-500", border: "border-l-blue-500" },
  "#a855f7": { text: "text-purple-500", border: "border-l-purple-500" },
  "#f97316": { text: "text-orange-500", border: "border-l-orange-500" },
  "#eab308": { text: "text-yellow-500", border: "border-l-yellow-500" },
  "#94a3b8": { text: "text-slate-400", border: "border-l-slate-400" },
  "#ec4899": { text: "text-pink-500", border: "border-l-pink-500" },
  "#14b8a6": { text: "text-teal-500", border: "border-l-teal-500" },
  // Seeded system item types (prisma/seed.ts).
  "#8b5cf6": { text: "text-violet-500", border: "border-l-violet-500" },
  "#fde047": { text: "text-yellow-300", border: "border-l-yellow-300" },
  "#6b7280": { text: "text-gray-500", border: "border-l-gray-500" },
  "#10b981": { text: "text-emerald-500", border: "border-l-emerald-500" },
};

const FALLBACK: PaletteEntry = {
  text: "text-muted-foreground",
  border: "border-l-border",
};

export function palette(hex: string | null | undefined): PaletteEntry {
  return (hex && PALETTE[hex]) || FALLBACK;
}

/** Accent text colour class for an item type, looked up by id. */
export function typeTextColor(typeId: string): string {
  const type = mockItemTypes.find((candidate) => candidate.id === typeId);
  return type ? palette(type.color).text : FALLBACK.text;
}
