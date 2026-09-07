export interface PostJsonResult<T> {
  /** `res.ok` — `false` on any non-2xx, and `false` when the request never completed. */
  ok: boolean;
  /** HTTP status, or `0` when the fetch itself threw (offline / DNS / CORS). */
  status: number;
  /** Parsed JSON body, or `null` when there was none or it wasn't JSON. */
  data: T | null;
}

/**
 * POST `body` as JSON. Never throws — a network failure comes back as
 * `{ ok: false, status: 0, data: null }`. Shared by the auth / profile forms,
 * which then branch on `status` for the network-vs-server distinction.
 */
export async function postJson<T = unknown>(
  url: string,
  body: unknown,
): Promise<PostJsonResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, data: null };
  }

  const data = (await res.json().catch(() => null)) as T | null;
  return { ok: res.ok, status: res.status, data };
}
