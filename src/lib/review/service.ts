import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";
import { TRANSACTION_REVIEW_SYSTEM_PROMPT } from "./prompt";
import { decideCheckout, validateEvidence } from "./policy";
import { applyRuleChecks } from "./rules";

export const briefSchema = z.object({
  listing: z.string().trim().min(30).max(4000),
  clarification: z.string().trim().max(2000),
});

const reviewSchema = z.object({
  summary: z.string().min(10).max(700),
  findings: z.array(z.object({
    severity: z.enum(["info", "clarify", "block"]),
    explanation: z.string().min(8).max(500),
    evidenceQuote: z.string().min(8).max(500),
  })).min(1).max(6),
  questions: z.array(z.string().min(8).max(300)).max(3),
});

export async function reviewTransaction(input: unknown) {
  const brief = briefSchema.parse(input);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.startsWith("your_")) {
    throw new Error("CLAUDE_SETUP_REQUIRED");
  }
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
  const { output, usage } = await generateText({
    model: createAnthropic({ apiKey })(model),
    system: TRANSACTION_REVIEW_SYSTEM_PROMPT,
    prompt: JSON.stringify({ product: "One 512px PNG avatar from a supplied logo", amount: "5.00", currency: "USD", ...brief }),
    output: Output.object({ schema: reviewSchema }),
    // Bounds the worst-case cost of one review while leaving room for adaptive thinking.
    maxOutputTokens: 16000,
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(45000),
  });
  const evidence = `${brief.listing}\n${brief.clarification}`;
  if (!validateEvidence(evidence, output)) {
    throw new Error("UNSUPPORTED_MODEL_EVIDENCE");
  }
  const review = applyRuleChecks(evidence, output);
  return {
    review,
    model,
    ruleOverride: decideCheckout(review) !== decideCheckout(output),
    usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens },
  };
}
