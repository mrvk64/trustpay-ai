import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { TransactionReview } from "./policy";
import { decideCheckout } from "./policy";

type Assessment = {
  id: string;
  owner: string;
  expiresAt: number;
  review: TransactionReview;
  acknowledgedAt?: string;
  order?: Promise<string>;
};

const REVIEW_LIFETIME = 30 * 60 * 1000;

/** The buyer must review again; retrying the same payment cannot succeed. */
export class ReviewRequiredError extends Error {
  constructor(message = "This review is no longer active. It expired, was replaced by a newer review, or the app restarted. Review the terms again to continue.") {
    super(message);
    this.name = "ReviewRequiredError";
  }
}
// Single-process local prototype. Replace with durable storage before hosted judging.
const state = globalThis as typeof globalThis & { trustpayAssessments?: Map<string, Assessment> };
const assessments = state.trustpayAssessments ??= new Map<string, Assessment>();

export async function reviewOwner() {
  const jar = await cookies();
  let owner = jar.get("trustpay-session")?.value;
  if (!owner || !/^[a-f0-9-]{36}$/.test(owner)) {
    owner = randomUUID();
    jar.set("trustpay-session", owner, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  return owner;
}

export function revokeAssessments(owner: string) {
  for (const [id, assessment] of assessments) {
    if (assessment.owner === owner || assessment.expiresAt < Date.now()) assessments.delete(id);
  }
}

export function saveAssessment(owner: string, review: TransactionReview) {
  const assessment: Assessment = { id: randomUUID(), owner, review, expiresAt: Date.now() + REVIEW_LIFETIME };
  assessments.set(assessment.id, assessment);
  return assessment.id;
}

export function requireAssessment(owner: string, id: string) {
  const assessment = assessments.get(id);
  if (!assessment || assessment.owner !== owner || assessment.expiresAt < Date.now() || decideCheckout(assessment.review) !== "eligible") {
    throw new ReviewRequiredError();
  }
  return assessment;
}

/** Records the buyer's approval of the reviewed terms and keeps the review open while PayPal approval is in progress. */
export function acknowledgeAssessment(assessment: Assessment) {
  assessment.acknowledgedAt ??= new Date().toISOString();
  assessment.expiresAt = Math.max(assessment.expiresAt, Date.now() + REVIEW_LIFETIME);
}
