import { describe, expect, it } from "vitest";
import { clientIp, readLimitConfig, ReviewLimiter } from "./limits";

function limiterAt(start: string, config = { perSessionPerHour: 2, perIpPerHour: 3, perDay: 4 }) {
  let now = Date.parse(start);
  const limiter = new ReviewLimiter(config, () => now);
  return { limiter, advance: (ms: number) => { now += ms; } };
}

describe("review limits", () => {
  it("caps one browser per hour and reopens when the window resets", () => {
    const { limiter, advance } = limiterAt("2026-11-01T10:00:00Z");
    expect(limiter.take("a", null).ok).toBe(true);
    expect(limiter.take("a", null).ok).toBe(true);
    expect(limiter.take("a", null)).toEqual({ ok: false, scope: "session", retryAfterMs: 60 * 60 * 1000 });
    advance(60 * 60 * 1000);
    expect(limiter.take("a", null).ok).toBe(true);
  });

  it("caps an IP across browsers", () => {
    const { limiter } = limiterAt("2026-11-01T10:00:00Z");
    expect(limiter.take("a", "203.0.113.5").ok).toBe(true);
    expect(limiter.take("b", "203.0.113.5").ok).toBe(true);
    expect(limiter.take("c", "203.0.113.5").ok).toBe(true);
    expect(limiter.take("d", "203.0.113.5")).toMatchObject({ ok: false, scope: "ip" });
  });

  it("enforces the daily cap for everyone until midnight UTC", () => {
    const { limiter, advance } = limiterAt("2026-11-01T22:00:00Z");
    for (const session of ["a", "b", "c", "d"]) expect(limiter.take(session, null).ok).toBe(true);
    expect(limiter.take("e", null)).toEqual({ ok: false, scope: "day", retryAfterMs: 2 * 60 * 60 * 1000 });
    advance(2 * 60 * 60 * 1000);
    expect(limiter.take("e", null).ok).toBe(true);
  });

  it("does not count a refused review against any window", () => {
    const { limiter } = limiterAt("2026-11-01T10:00:00Z", { perSessionPerHour: 1, perIpPerHour: 10, perDay: 2 });
    expect(limiter.take("a", null).ok).toBe(true);
    expect(limiter.take("a", null).ok).toBe(false);
    expect(limiter.take("a", null).ok).toBe(false);
    expect(limiter.take("b", null).ok).toBe(true);
  });

  it("reads positive whole-number overrides and ignores anything else", () => {
    expect(readLimitConfig({ REVIEW_LIMIT_PER_DAY: "250", REVIEW_LIMIT_PER_IP_HOUR: "0", REVIEW_LIMIT_PER_SESSION_HOUR: "abc" }))
      .toEqual({ perSessionPerHour: 20, perIpPerHour: 40, perDay: 250 });
  });

  it("prefers the Cloudflare client IP over a spoofable forwarded list", () => {
    const headers = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });
    expect(clientIp(headers({ "true-client-ip": "198.51.100.7", "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("198.51.100.7");
    expect(clientIp(headers({ "x-forwarded-for": "198.51.100.8, 10.0.0.1" }))).toBe("198.51.100.8");
    expect(clientIp(headers({}))).toBeNull();
  });
});
