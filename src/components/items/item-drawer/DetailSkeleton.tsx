/** Loading placeholder for the item drawer's detail block (shown until the fetch resolves). */
export function DetailSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-16 rounded bg-muted" />
        <div className="h-24 w-full rounded-lg bg-muted" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-12 rounded bg-muted" />
        <div className="flex gap-1.5">
          <div className="h-5 w-12 rounded bg-muted" />
          <div className="h-5 w-14 rounded bg-muted" />
          <div className="h-5 w-10 rounded bg-muted" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-14 rounded bg-muted" />
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-4 w-40 rounded bg-muted" />
      </div>
    </div>
  );
}
