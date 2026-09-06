"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * App-wide toast host. Mounted once in the root layout.
 *
 * The app is dark-mode-first (`<html class="dark">`, no theme switcher), so the
 * theme is pinned rather than read from `next-themes`. `richColors` gives
 * success/error toasts their own accent.
 */
export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      richColors
      closeButton
      position="bottom-right"
    />
  );
}
