"use client";

import { useEffect, useRef } from "react";
import {
  AppWindow,
  ArrowRight,
  Bookmark,
  Code2,
  FileText,
  FolderGit2,
  MessagesSquare,
  NotebookText,
  Terminal,
  type LucideIcon,
} from "lucide-react";

import { CHAOS_SOURCES, PREVIEW_CARD_TYPES, itemType } from "@/lib/home-content";
import { cn } from "@/lib/utils";

/** Stand-ins for the scattered tools, matched positionally to `CHAOS_SOURCES`. */
const CHAOS_ICONS: LucideIcon[] = [
  NotebookText,
  FolderGit2,
  MessagesSquare,
  Code2,
  AppWindow,
  Terminal,
  FileText,
  Bookmark,
];

const ICON_SIZE = 56;

/**
 * The hero's "chaos → order" visual: a physics-driven field of scattered tool
 * icons, an arrow, and a static dashboard preview. The three parts sit in a row
 * on desktop and stack (arrow pointing down) on mobile.
 */
export function ChaosOrderFlow() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    const els = iconRefs.current.filter(
      (el): el is HTMLSpanElement => el !== null,
    );
    if (els.length === 0) return;

    // Reduced motion: drop into a plain scattered grid, no animation loop.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        el.style.transform = `translate(${12 + col * 80}px, ${28 + row * 96}px)`;
      });
      return;
    }

    const bounds = { w: field.clientWidth, h: field.clientHeight };
    const mouse = { x: -9999, y: -9999, active: false };

    const particles = els.map((el) => ({
      el,
      x: Math.random() * Math.max(1, bounds.w - ICON_SIZE),
      y: Math.random() * Math.max(1, bounds.h - ICON_SIZE),
      vx: (Math.random() - 0.5) * 0.9,
      vy: (Math.random() - 0.5) * 0.9,
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.6,
    }));

    const measure = () => {
      bounds.w = field.clientWidth;
      bounds.h = field.clientHeight;
    };
    const onMove = (e: MouseEvent) => {
      const rect = field.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const onLeave = () => {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    };

    window.addEventListener("resize", measure, { passive: true });
    field.addEventListener("mousemove", onMove);
    field.addEventListener("mouseleave", onLeave);

    const MAX_V = 1.15;
    const REPEL_RADIUS = 122;
    let raf = 0;

    const tick = (t: number) => {
      const time = t * 0.001;
      // While hovering, damp harder and cap lower so icons ease away slowly.
      const damp = mouse.active ? 0.9 : 0.992;
      const cap = mouse.active ? 0.62 : MAX_V;

      for (const p of particles) {
        // Gentle drift so the field keeps a little life when idle.
        p.vx += (Math.random() - 0.5) * 0.045;
        p.vy += (Math.random() - 0.5) * 0.045;

        if (mouse.active) {
          const cx = p.x + ICON_SIZE / 2;
          const cy = p.y + ICON_SIZE / 2;
          const dx = cx - mouse.x;
          const dy = cy - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < REPEL_RADIUS && dist > 0.01) {
            const force = (1 - dist / REPEL_RADIUS) * 0.42;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        p.vx *= damp;
        p.vy *= damp;
        p.vx = Math.max(-cap, Math.min(cap, p.vx));
        p.vy = Math.max(-cap, Math.min(cap, p.vy));
        p.x += p.vx;
        p.y += p.vy;

        const maxX = bounds.w - ICON_SIZE;
        const maxY = bounds.h - ICON_SIZE;
        if (p.x <= 0) {
          p.x = 0;
          p.vx = Math.abs(p.vx);
        } else if (p.x >= maxX) {
          p.x = maxX;
          p.vx = -Math.abs(p.vx);
        }
        if (p.y <= 0) {
          p.y = 0;
          p.vy = Math.abs(p.vy);
        } else if (p.y >= maxY) {
          p.y = maxY;
          p.vy = -Math.abs(p.vy);
        }

        const rot = Math.sin(time * 0.8 + p.phase) * 10 + p.spin * 6;
        const scale = 1 + Math.sin(time * 1.4 + p.phase) * 0.06;
        p.el.style.transform = `translate(${p.x.toFixed(2)}px, ${p.y.toFixed(
          2,
        )}px) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      field.removeEventListener("mousemove", onMove);
      field.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div className="mt-16 grid items-center gap-5 md:grid-cols-[1fr_auto_1fr]">
      {/* CHAOS */}
      <figure className="relative min-h-[300px] rounded-xl border border-border bg-card/60 p-4 pt-11 shadow-xl">
        <figcaption className="absolute left-4 top-3.5 font-mono text-xs text-muted-foreground">
          Your knowledge today&hellip;
        </figcaption>
        <div
          ref={fieldRef}
          aria-hidden
          className="relative h-[260px] overflow-hidden rounded-lg"
        >
          {CHAOS_ICONS.map((Icon, i) => (
            <span
              key={CHAOS_SOURCES[i]}
              ref={(el) => {
                iconRefs.current[i] = el;
              }}
              title={CHAOS_SOURCES[i]}
              className="absolute left-0 top-0 grid size-14 place-items-center rounded-xl border border-border bg-white/[0.045] text-muted-foreground [will-change:transform]"
            >
              <Icon className="size-7" />
            </span>
          ))}
        </div>
      </figure>

      {/* ARROW */}
      <div
        aria-hidden
        className="grid place-items-center text-[#6366f1] max-md:rotate-90"
      >
        <ArrowRight className="size-12 animate-pulse [filter:drop-shadow(0_0_10px_rgba(99,102,241,0.55))] motion-reduce:animate-none" />
      </div>

      {/* ORDER */}
      <figure className="relative min-h-[300px] rounded-xl border border-border bg-card/60 p-4 pt-11 shadow-xl">
        <figcaption className="absolute left-4 top-3.5 font-mono text-xs text-muted-foreground">
          &hellip;with DevStash
        </figcaption>
        <DashboardPreview />
      </figure>
    </div>
  );
}

const PREVIEW_NAV = [
  "All items",
  "Snippets",
  "Prompts",
  "Commands",
  "Collections",
  "Favorites",
];

/** Static faux-app shown on the "order" side. Pure markup. */
function DashboardPreview() {
  return (
    <div className="grid h-[260px] grid-cols-[92px_1fr] gap-3" aria-hidden>
      <aside className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-2.5">
        <span className="mb-1 font-mono text-[0.6rem] text-[#3b82f6]">
          &lt;/&gt; DevStash
        </span>
        {PREVIEW_NAV.map((label, i) => (
          <span
            key={label}
            className={cn(
              "rounded px-1.5 py-1 text-[0.62rem] text-muted-foreground",
              i === 0 && "bg-[#3b82f6]/15 text-foreground",
            )}
          >
            {label}
          </span>
        ))}
      </aside>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="flex flex-1 items-center justify-between rounded border border-border bg-muted/30 px-1.5 py-1 text-[0.58rem] text-muted-foreground">
            Search&hellip;
            <kbd className="rounded border border-border bg-card px-1 font-mono text-[0.5rem] text-muted-foreground">
              ⌘K
            </kbd>
          </span>
          <span className="rounded bg-gradient-to-br from-[#3b82f6] to-[#6366f1] px-2 py-1 text-[0.58rem] font-semibold text-white">
            + New
          </span>
        </div>

        <div className="grid flex-1 grid-cols-3 gap-2">
          {PREVIEW_CARD_TYPES.map((typeName, i) => {
            const type = itemType(typeName);
            return (
              <span
                key={`${typeName}-${i}`}
                className={cn(
                  "flex min-h-[46px] min-w-0 flex-col gap-1.5 rounded-md border border-border border-t-2 bg-muted/30 p-2",
                  type.topBorder,
                )}
              >
                <em className={cn("size-3 rounded-sm", type.swatch)} />
                <span className="h-1 rounded-full bg-border" />
                <span className="h-1 w-3/5 rounded-full bg-border" />
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
