import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
import type { TransactionReview } from "./policy";
import {
  acknowledgeAssessment,
  requireAssessment,
  ReviewRequiredError,
  revokeAssessments,
  saveAssessment,
} from "./session";

const eligible: TransactionReview = { summary: "Essential terms stated.", findings: [], questions: [] };

describe("assessment session binding", () => {
  afterEach(() => vi.useRealTimers());

  it("only lets the reviewing browser pay for an eligible review", () => {
    const id = saveAssessment("buyer-a", eligible);
    expect(requireAssessment("buyer-a", id).id).toBe(id);
    expect(() => requireAssessment("buyer-b", id)).toThrow(ReviewRequiredError);
  });

  it("refuses checkout for a review that still needs clarification", () => {
    const id = saveAssessment("buyer-a", { ...eligible, questions: ["When is delivery?"] });
    expect(() => requireAssessment("buyer-a", id)).toThrow(ReviewRequiredError);
  });

  it("invalidates earlier reviews when the buyer starts a new one", () => {
    const id = saveAssessment("buyer-a", eligible);
    revokeAssessments("buyer-a");
    expect(() => requireAssessment("buyer-a", id)).toThrow(ReviewRequiredError);
  });

  it("records acknowledgement once and keeps the review open during PayPal approval", () => {
    vi.useFakeTimers();
    const id = saveAssessment("buyer-a", eligible);
    vi.advanceTimersByTime(25 * 60 * 1000);
    const assessment = requireAssessment("buyer-a", id);
    acknowledgeAssessment(assessment);
    const firstAcknowledgement = assessment.acknowledgedAt;
    expect(firstAcknowledgement).toBeTruthy();

    vi.advanceTimersByTime(20 * 60 * 1000);
    acknowledgeAssessment(requireAssessment("buyer-a", id));
    expect(assessment.acknowledgedAt).toBe(firstAcknowledgement);

    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(() => requireAssessment("buyer-a", id)).toThrow(ReviewRequiredError);
  });
});
