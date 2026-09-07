/**
 * Wrap `fn` so rapid calls collapse into one that runs `delayMs` after the last
 * call. The returned function also exposes:
 *
 * - `flush()` — run the pending call immediately (with the most recent args)
 * - `cancel()` — drop the pending call
 *
 * Pure timer logic, no React — the caller owns any state.
 */
export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  flush(): void;
  cancel(): void;
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs: number,
): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: A | null = null;

  const run = () => {
    timer = null;
    if (!pendingArgs) return;
    const args = pendingArgs;
    pendingArgs = null;
    fn(...args);
  };

  const debounced = ((...args: A) => {
    pendingArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, delayMs);
  }) as Debounced<A>;

  debounced.flush = () => {
    if (timer) clearTimeout(timer);
    run();
  };

  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    pendingArgs = null;
  };

  return debounced;
}
