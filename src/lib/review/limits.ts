/**
 * Fixed-window caps that keep a public demo from spending unbounded Claude credits.
 * Counters live in single-process memory, like assessments, so a restart clears them.
 * The daily cap is the real cost guard: browser and IP caps are fairness limits that a
 * determined visitor can sidestep by clearing cookies or spoofing headers.
 */
export type LimitConfig = {
  perSessionPerHour: number;
  perIpPerHour: number;
  perDay: number;
};

export type LimitResult =
  | { ok: true }
  | { ok: false; scope: "session" | "ip" | "day"; retryAfterMs: number };

const HOUR = 60 * 60 * 1000;

export const DEFAULT_LIMITS: LimitConfig = { perSessionPerHour: 20, perIpPerHour: 40, perDay: 100 };

export function readLimitConfig(env: Record<string, string | undefined> = process.env): LimitConfig {
  const read = (name: string, fallback: number) => {
    const value = Number(env[name]);
    return env[name] !== undefined && Number.isInteger(value) && value > 0 ? value : fallback;
  };
  return {
    perSessionPerHour: read("REVIEW_LIMIT_PER_SESSION_HOUR", DEFAULT_LIMITS.perSessionPerHour),
    perIpPerHour: read("REVIEW_LIMIT_PER_IP_HOUR", DEFAULT_LIMITS.perIpPerHour),
    perDay: read("REVIEW_LIMIT_PER_DAY", DEFAULT_LIMITS.perDay),
  };
}

function nextUtcMidnight(now: number) {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
}

export class ReviewLimiter {
  private windows = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private config: LimitConfig,
    private now: () => number = Date.now,
  ) {}

  /** Counts one review against every applicable window, or reports the first window that is full. */
  take(session: string, ip: string | null): LimitResult {
    const now = this.now();
    const checks = [
      { scope: "day" as const, key: "day", limit: this.config.perDay, resetAt: nextUtcMidnight(now) },
      { scope: "session" as const, key: `session:${session}`, limit: this.config.perSessionPerHour, resetAt: now + HOUR },
      ...(ip ? [{ scope: "ip" as const, key: `ip:${ip}`, limit: this.config.perIpPerHour, resetAt: now + HOUR }] : []),
    ];

    for (const check of checks) {
      const window = this.windows.get(check.key);
      if (window && window.resetAt > now && window.count >= check.limit) {
        return { ok: false, scope: check.scope, retryAfterMs: window.resetAt - now };
      }
    }

    for (const check of checks) {
      const window = this.windows.get(check.key);
      if (window && window.resetAt > now) window.count += 1;
      else this.windows.set(check.key, { count: 1, resetAt: check.resetAt });
    }
    if (this.windows.size > 5000) this.prune(now);
    return { ok: true };
  }

  private prune(now: number) {
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
  }
}

/** Best-effort client IP. Render sits behind Cloudflare, whose True-Client-IP the client cannot set. */
export function clientIp(headers: { get(name: string): string | null }) {
  return headers.get("true-client-ip")
    ?? headers.get("cf-connecting-ip")
    ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? null;
}
