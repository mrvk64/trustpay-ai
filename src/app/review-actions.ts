"use server";
import { ZodError } from "zod";
import { reviewTransaction } from "@/lib/review/service";
import { reviewOwner, revokeAssessments, saveAssessment } from "@/lib/review/session";
import { decideCheckout } from "@/lib/review/policy";

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

export async function assessPurchase(input: unknown) {
  const owner = await reviewOwner();
  revokeAssessments(owner);
  try {
    const { review, model, ruleOverride } = await reviewTransaction(input);
    return { ok: true as const, review, model, ruleOverride, decision: decideCheckout(review), assessmentId: saveAssessment(owner, review) };
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
