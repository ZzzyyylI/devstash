/**
 * The single return shape for every Server Action in `src/actions/`.
 *
 * `fieldErrors` (from `ZodError.flatten().fieldErrors`) is set only when a
 * payload fails validation, so the forms can surface per-field messages.
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
