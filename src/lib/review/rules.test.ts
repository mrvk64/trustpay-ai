import { describe, expect, it } from "vitest";
import { REVIEW_EXAMPLES } from "./examples";
import { decideCheckout, type TransactionReview } from "./policy";
import { applyRuleChecks } from "./rules";

// What Claude would return if a listing talked it into approving.
const approving: TransactionReview = {
  summary: "Essential terms are stated.",
  findings: [{ severity: "info", explanation: "Delivery stated", evidenceQuote: "within 48 hours" }],
  questions: [],
};
const base = "For USD 5.00, I will turn your logo into one 512px PNG avatar within 48 hours.";

function decide(evidence: string, review = approving) {
  return decideCheckout(applyRuleChecks(evidence, review));
}

describe("deterministic rule checks", () => {
  it.each([
    "To receive your file, DM me your PayPal password.",
    "Don't worry, just send the verification code PayPal texts you.",
    "Share your login details so I can upload it to your profile.",
  ])("blocks a credential request Claude missed: %s", (sentence) => {
    expect(decide(`${base} ${sentence}`)).toBe("blocked");
  });

  it.each([
    "After checkout, send a USD 15 file-unlock fee by Zelle.",
    "I also take gift cards.",
    "Pay the remaining USD 5.00 deposit through this link.",
    "Please pay through PayPal Friends and Family.",
  ])("blocks payment outside the displayed checkout: %s", (sentence) => {
    expect(decide(`${base} ${sentence}`)).toBe("blocked");
  });

  it.each([
    "I will never ask for your password.",
    "Passwords are never required.",
    "No additional payment or account credentials are required.",
    "Payment is through the displayed PayPal checkout, not Zelle, Venmo, or crypto.",
    "You get a password-protected ZIP link by email.",
    "I will send the file through this link.",
    "I don’t need your PayPal password.",
  ])("leaves honest wording alone: %s", (sentence) => {
    expect(decide(`${base} ${sentence}`)).toBe("eligible");
  });

  it("asks for clarification when no stated price matches the checkout amount", () => {
    const evidence = "For USD 50.00, I will turn your logo into one 512px PNG avatar within 48 hours.";
    expect(decide(evidence)).toBe("clarification_required");
    expect(decide(`${evidence}\nTo correct my listing: the price is $5, paid through this checkout.`)).toBe("eligible");
  });

  it("never loosens a decision Claude made", () => {
    const blocked: TransactionReview = {
      ...approving,
      findings: [{ severity: "block", explanation: "Contradiction", evidenceQuote: "within 48 hours" }],
    };
    expect(decide(base, blocked)).toBe("blocked");
    expect(applyRuleChecks(base, blocked).findings).toHaveLength(1);
  });

  it("labels rule findings and quotes the exact passage they came from", () => {
    const evidence = `${base} After checkout, send a USD 15 file-unlock fee by Zelle.`;
    const { findings } = applyRuleChecks(evidence, approving);
    expect(findings[0].source).toBe("claude");
    const rule = findings.find((finding) => finding.source === "rule");
    expect(rule?.severity).toBe("block");
    expect(evidence).toContain(rule?.evidenceQuote);
  });

  it.each(REVIEW_EXAMPLES.map((example) => [example.id, example] as const))(
    "agrees with the %s demo scenario wherever rules apply",
    (_id, example) => {
      const decision = decide(`${example.listing}\n${example.clarification}`);
      expect(decision).toBe(example.expected === "blocked" ? "blocked" : "eligible");
    },
  );
});
