"use server";
import { headers } from "next/headers";
import { ZodError } from "zod";
import { briefSchema, reviewTransaction } from "@/lib/review/service";
import { reviewOwner, revokeAssessments, saveAssessment } from "@/lib/review/session";
import { decideCheckout } from "@/lib/review/policy";
import { clientIp, readLimitConfig, ReviewLimiter, type LimitResult } from "@/lib/review/limits";

const state = globalThis as typeof globalThis & { trustpayLimiter?: ReviewLimiter };
const limiter = state.trustpayLimiter ??= new ReviewLimiter(readLimitConfig());

function failureMessage(error: unknown) {
  if (error instanceof ZodError) return "Add at least 30 characters of the seller’s terms, then review again.";
  if (error instanceof Error && error.message === "CLAUDE_SETUP_REQUIRED") {
    return "Add your Claude API key to ANTHROPIC_API_KEY in .env.local, then restart the app.";
  }
  if (error instanceof Error && error.message === "UNSUPPORTED_MODEL_EVIDENCE") {
    return "Claude quoted text that isn’t in the supplied terms, so TrustPay discarded that review. Checkout stays paused; run the review again.";
  }
  return "The review could not be completed. Check the input and Claude configuration, then try again. Checkout stays paused.";
}

function limitMessage(result: Extract<LimitResult, { ok: false }>) {
  if (result.scope === "day") {
    return "This demo has reached today’s review limit. It resets at midnight UTC, or you can run TrustPay locally with your own Claude key (see the README).";
  }
  const minutes = Math.max(1, Math.ceil(result.retryAfterMs / 60000));
  return `You’ve reached this demo’s review limit for now. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

export async function assessPurchase(input: unknown) {
  const owner = await reviewOwner();
  revokeAssessments(owner);
  try {
    // Validate before counting, so a typo doesn't use up a visitor's quota.
    const brief = briefSchema.parse(input);
    const allowed = limiter.take(owner, clientIp(await headers()));
    if (!allowed.ok) {
      console.warn("Review limit reached", { scope: allowed.scope });
      return { ok: false as const, message: limitMessage(allowed) };
    }
    const { review, model, ruleOverride, usage } = await reviewTransaction(brief);
    const decision = decideCheckout(review);
    console.info("Transaction review", { decision, ...usage });
    return { ok: true as const, review, model, ruleOverride, decision, assessmentId: saveAssessment(owner, review) };
  } catch (error) {
    // Log the failure type only; the reviewed text and API responses stay out of the log.
    const candidate = error as { name?: unknown; message?: unknown; statusCode?: unknown };
    console.error("Transaction review failed", {
      errorName: typeof candidate?.name === "string" ? candidate.name : "Error",
      code: candidate?.message === "CLAUDE_SETUP_REQUIRED" || candidate?.message === "UNSUPPORTED_MODEL_EVIDENCE" ? candidate.message : undefined,
      statusCode: typeof candidate?.statusCode === "number" ? candidate.statusCode : undefined,
    });
    return { ok: false as const, message: failureMessage(error) };
  }
}
