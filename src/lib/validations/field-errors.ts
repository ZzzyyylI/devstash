import type { ZodError } from "zod";

/** Per-field error messages plus a top-level `form` slot for request-level failures. */
export type FieldErrors<K extends string> = Partial<Record<K | "form", string>>;

/**
 * The first error message per field from a Zod parse failure, keyed by the top
 * path segment. `allowed`, when given, restricts which keys are kept (issues on
 * other paths are dropped rather than shown against the wrong field).
 */
export function collectFieldErrors<K extends string>(
  error: ZodError,
  allowed?: readonly K[],
): FieldErrors<K> {
  const out: FieldErrors<K> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== "string") continue;
    if (allowed && !allowed.includes(key as K)) continue;
    const k = key as K;
    if (out[k] === undefined) out[k] = issue.message;
  }
  return out;
}
