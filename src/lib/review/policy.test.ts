import { describe, expect, it } from "vitest";
import { decideCheckout, validateEvidence, type TransactionReview } from "./policy";

const review: TransactionReview = {
  summary: "Delivery terms need clarification.",
  findings: [],
  questions: [],
};

describe("transaction checkout policy", () => {
  it("prevents payment while a clarification question remains", () => {
    expect(decideCheckout({ ...review, questions: ["When is delivery?"] })).toBe(
      "clarification_required",
    );
  });

  it("blocks payment even if a model also reports reassuring findings", () => {
    expect(decideCheckout({
      ...review,
      findings: [
        { severity: "info", explanation: "Clear price", evidenceQuote: "Price is five dollars" },
        { severity: "block", explanation: "Conflicting terms", evidenceQuote: "Pay again off platform" },
      ],
    })).toBe("blocked");
  });

  it("rejects invented evidence instead of presenting it to the buyer", () => {
    expect(validateEvidence("Delivery within two days.", {
      ...review,
      findings: [{ severity: "info", explanation: "Unsupported", evidenceQuote: "Seller identity verified" }],
    })).toBe(false);
  });

  it("accepts an exact quote with harmless whitespace and case differences", () => {
    expect(validateEvidence("Delivery within TWO days.", {
      ...review,
      findings: [{ severity: "info", explanation: "Delivery stated", evidenceQuote: "delivery within two   days" }],
    })).toBe(true);
  });

  it("permits checkout only when no blocking or clarification finding remains", () => {
    expect(decideCheckout(review)).toBe("eligible");
  });
});
