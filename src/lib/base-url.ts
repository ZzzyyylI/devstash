/**
 * Resolve the app's public origin (e.g. `https://devstash.app`) for building
 * absolute links in emails.
 *
 * Prefers an explicit env var so production/staging can't be fooled by a
 * spoofed `Host` header; falls back to the incoming request's forwarded host so
 * local dev needs no configuration.
 */
export function getBaseUrl(request: Request): string {
  const configured = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");

  const headers = request.headers;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  const proto =
    headers.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
      ? "http"
      : "https");

  if (host) return `${proto}://${host}`;

  // Last resort — matches the dev server default.
  return "http://localhost:3000";
}
