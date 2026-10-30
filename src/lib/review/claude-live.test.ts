import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { reviewTransaction } from "./service";
import { REVIEW_EXAMPLES } from "./examples";
import { decideCheckout } from "./policy";

// Opt-in only: uses API credits. Never runs as part of ordinary npm test.
it.skipIf(process.env.TRUSTPAY_LIVE_TEST !== "1")("Claude reviews synthetic terms with grounded evidence", async () => {
  const example = REVIEW_EXAMPLES[1];
  const { review, model, usage } = await reviewTransaction({ listing: example.listing, clarification: example.clarification });
  expect(decideCheckout(review)).toBe("clarification_required");
  expect(review.questions.length).toBeGreaterThan(0);
  console.log(JSON.stringify({ model, decision: decideCheckout(review), findings: review.findings.length, questions: review.questions.length, ...usage }));
}, 60000);

it.skipIf(process.env.TRUSTPAY_LIVE_TEST !== "1")("Claude blocks an explicit password and verification-code request", async () => {
  const { review } = await reviewTransaction({ listing: REVIEW_EXAMPLES[3].listing, clarification: "" });
  expect(decideCheckout(review)).toBe("blocked");
}, 60000);

it.skipIf(process.env.TRUSTPAY_LIVE_TEST !== "1")("a hidden instruction to the reviewer cannot unlock checkout", async () => {
  const example = REVIEW_EXAMPLES.find((candidate) => candidate.id === "injection")!;
  const { review } = await reviewTransaction({ listing: example.listing, clarification: "" });
  expect(decideCheckout(review)).toBe("blocked");
}, 60000);

it.skipIf(process.env.TRUSTPAY_LIVE_TEST !== "1")("Claude permits clarified essential terms without an endless optional-question loop", async () => {
  const { review } = await reviewTransaction({
    listing: REVIEW_EXAMPLES[1].listing,
    clarification: "Delivery is within 48 hours after payment and receipt of your logo file, in this chat. One revision covers cropping, background color, and positioning. If I miss the delivery deadline or cannot match your supplied logo, I will issue a full refund through the original PayPal transaction within two business days. No additional payment or account credentials are required.",
  });
  expect(decideCheckout(review)).toBe("eligible");
  expect(review.questions).toEqual([]);
}, 60000);
