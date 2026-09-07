/**
 * Split a comma-separated tag input into trimmed, non-empty tag names.
 *
 * This is the client-side normalisation shared by the "New Item" dialog and the
 * item drawer's edit form. The server actions still re-normalise (trim, de-dupe,
 * cap) via Zod, so this only has to be good enough for the request payload.
 */
export function parseTagsInput(input: string): string[] {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
