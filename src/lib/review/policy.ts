/** Payment policy is code-owned. Model findings never authorize payment alone. */
export type ReviewFinding = {
  severity: "info" | "clarify" | "block";
  explanation: string;
  evidenceQuote: string;
  /** Who raised it: Claude, or a deterministic TrustPay rule. */
  source?: "claude" | "rule";
};

export type TransactionReview = {
  summary: string;
  findings: ReviewFinding[];
  questions: string[];
};

export type CheckoutDecision = "eligible" | "clarification_required" | "blocked";

export function decideCheckout(review: TransactionReview): CheckoutDecision {
  if (review.findings.some((finding) => finding.severity === "block")) {
    return "blocked";
  }
  if (
    review.questions.length > 0 ||
    review.findings.some((finding) => finding.severity === "clarify")
  ) {
    return "clarification_required";
  }
  return "eligible";
}

/** A quote must actually occur in the reviewed evidence; invented quotes fail closed. */
export function validateEvidence(
  evidence: string,
  review: TransactionReview,
): boolean {
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();
  const source = normalize(evidence);
  return review.findings.every((finding) => {
    const quote = normalize(finding.evidenceQuote);
    return quote.length >= 8 && source.includes(quote);
  });
}
