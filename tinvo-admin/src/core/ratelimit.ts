/**
 * Failed sign-in attempts, counted per key (an email, an IP) in a sliding window.
 * ponytail: in memory, which is right for the single-server deploy (one process);
 * move to a database table or Redis if the admin ever runs on several instances.
 */
export function limiter(max: number, windowMs: number, now = () => Date.now()) {
  const hits = new Map<string, number[]>();
  const recent = (key: string) => (hits.get(key) ?? []).filter((t) => now() - t < windowMs);
  return {
    blocked: (key: string) => recent(key).length >= max,
    fail(key: string) {
      hits.set(key, [...recent(key), now()]);
      if (hits.size > 10_000) hits.clear(); // bound memory under a flood
    },
    clear: (key: string) => void hits.delete(key),
  };
}

/** Sign-in: 5 wrong passwords per account, 20 per IP, per 15 minutes. */
export const signInByEmail = limiter(5, 15 * 60_000);
export const signInByIp = limiter(20, 15 * 60_000);
