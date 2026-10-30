"use server";

import { randomUUID } from "node:crypto";

import {
  capturePayPalOrder,
  createPayPalOrder,
} from "@/lib/paypal/orders";
import type { CaptureReceipt } from "@/lib/paypal/order-data";
import {
  acknowledgeAssessment,
  requireAssessment,
  ReviewRequiredError,
  reviewOwner,
} from "@/lib/review/session";
import { persistReceipt, readReceipts } from "@/lib/review/receipts";

type ActionFailure = {
  ok: false;
  message: string;
  reference: string;
  /** Set when only a fresh review can unblock checkout. */
  code?: "REVIEW_REQUIRED";
};

export type CreateOrderResult = { ok: true; id: string } | ActionFailure;
export type CaptureOrderResult =
  | { ok: true; receipt: CaptureReceipt }
  | ActionFailure;

function logSafePayPalError(
  operation: "create" | "capture",
  error: unknown,
  reference: string,
) {
  const candidate = error as {
    name?: unknown;
    statusCode?: unknown;
    result?: { debugId?: unknown };
  };

  console.error("PayPal operation failed", {
    operation,
    reference,
    errorName: typeof candidate?.name === "string" ? candidate.name : "Error",
    statusCode:
      typeof candidate?.statusCode === "number" ? candidate.statusCode : undefined,
    debugId:
      typeof candidate?.result?.debugId === "string"
        ? candidate.result.debugId
        : undefined,
  });
}

function failure(
  operation: "create" | "capture",
  error: unknown,
): ActionFailure {
  const reference = randomUUID();

  if (error instanceof ReviewRequiredError) {
    console.warn("Checkout needs a fresh review", { operation, reference });
    return { ok: false, message: error.message, reference, code: "REVIEW_REQUIRED" };
  }

  logSafePayPalError(operation, error, reference);

  return {
    ok: false,
    message:
      operation === "create"
        ? "The sandbox order could not be created. Check the local PayPal setup."
        : "The approved sandbox order could not be captured.",
    reference,
  };
}

export async function createOrder(
  assessmentId: string,
  termsAcknowledged: boolean,
): Promise<CreateOrderResult> {
  try {
    const assessment = requireAssessment(await reviewOwner(), assessmentId);
    if (termsAcknowledged !== true) {
      throw new ReviewRequiredError("Confirm that you reviewed the terms before paying.");
    }
    acknowledgeAssessment(assessment);
    assessment.order ??= createPayPalOrder(assessment.id);
    try {
      return { ok: true, id: await assessment.order };
    } catch (error) {
      assessment.order = undefined;
      throw error;
    }
  } catch (error) {
    return failure("create", error);
  }
}

export async function captureOrder(
  orderId: string,
  assessmentId: string,
): Promise<CaptureOrderResult> {
  try {
    const owner = await reviewOwner();
    const existing = (await readReceipts(owner)).find((receipt) => receipt.assessmentId === assessmentId && receipt.payment.orderId === orderId);
    if (existing) return { ok: true, receipt: existing.payment };
    const assessment = requireAssessment(owner, assessmentId);
    if (!assessment.order || (await assessment.order) !== orderId) throw new Error("Order does not belong to this review.");
    const receipt = await capturePayPalOrder(orderId);
    try {
      await persistReceipt(owner, { assessmentId, acknowledgedAt: assessment.acknowledgedAt, capturedAt: new Date().toISOString(), review: assessment.review, payment: receipt });
    } catch (error) {
      // The payment is captured either way; never tell the buyer it failed because saving did.
      console.error("Captured receipt could not be saved", {
        orderId,
        errorName: error instanceof Error ? error.name : "Error",
      });
    }
    return { ok: true, receipt };
  } catch (error) {
    return failure("capture", error);
  }
}

export async function receiptHistory() {
  return readReceipts(await reviewOwner());
}
