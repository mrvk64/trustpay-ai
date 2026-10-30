"use client";

import { type Dispatch, type SetStateAction, useRef, useState } from "react";
import {
  INSTANCE_LOADING_STATE,
  PayPalProvider,
  type OnApproveDataOneTimePayments,
  usePayPal,
  usePayPalOneTimePaymentSession,
} from "@paypal/react-paypal-js/sdk-v6";

import { captureOrder, createOrder } from "@/app/actions";
import type { CaptureReceipt } from "@/lib/paypal/order-data";

type PayPalCheckoutProps = {
  clientId: string;
  assessmentId: string;
  /** Called when the server says only a fresh review can continue. */
  onReviewExpired: (message: string) => void;
};

type CheckoutState =
  | { name: "idle" }
  | { name: "processing"; message: string }
  | { name: "cancelled" }
  | { name: "error"; message: string }
  | { name: "complete"; receipt: CaptureReceipt };

const DEFAULT_ERROR =
  "The sandbox payment could not be completed. Try again and check the server log if it persists.";

function CheckoutButton({
  assessmentId,
  stateName,
  onStateChange,
  onReviewExpired,
}: {
  assessmentId: string;
  stateName: CheckoutState["name"];
  onStateChange: Dispatch<SetStateAction<CheckoutState>>;
  onReviewExpired: (message: string) => void;
}) {
  const { error, loadingStatus, isHydrated } = usePayPal();
  // The SDK's onError receives only its own error, so keep the server's explanation here.
  const serverFailure = useRef<string | null>(null);

  function rejectWith(result: { message: string; reference: string; code?: "REVIEW_REQUIRED" }): never {
    serverFailure.current = `${result.message} Reference: ${result.reference}`;
    onStateChange({ name: "error", message: serverFailure.current });
    if (result.code === "REVIEW_REQUIRED") {
      onReviewExpired(result.message);
    }
    throw new Error(result.message);
  }

  const session = usePayPalOneTimePaymentSession({
    createOrder: async () => {
      serverFailure.current = null;
      onStateChange({ name: "processing", message: "Creating a secure order…" });
      // This button only renders after the buyer ticks the acknowledgement.
      const result = await createOrder(assessmentId, true);

      if (!result.ok) {
        rejectWith(result);
      }

      return { orderId: result.id };
    },
    onApprove: async ({ orderId }: OnApproveDataOneTimePayments) => {
      onStateChange({
        name: "processing",
        message: "Capturing the approved order…",
      });
      const result = await captureOrder(orderId, assessmentId);

      if (!result.ok) {
        rejectWith(result);
      }

      onStateChange({ name: "complete", receipt: result.receipt });
    },
    onCancel: () => onStateChange({ name: "cancelled" }),
    onError: () => onStateChange({ name: "error", message: serverFailure.current ?? DEFAULT_ERROR }),
    presentationMode: "auto",
  });

  // PayPal's own button re-throws a failed createOrder from its click handler as an unhandled
  // rejection. The failure is already on screen, so settle the promise here instead.
  function startCheckout() {
    session.handleClick().catch(() => {
      onStateChange((current) =>
        current.name === "processing"
          ? { name: "error", message: serverFailure.current ?? DEFAULT_ERROR }
          : current,
      );
    });
  }

  if (loadingStatus === INSTANCE_LOADING_STATE.PENDING || !isHydrated) {
    return (
      <p className="checkout-message" role="status">
        Loading the secure PayPal checkout…
      </p>
    );
  }

  if (loadingStatus === INSTANCE_LOADING_STATE.REJECTED || error || session.error) {
    return (
      <p className="checkout-message error" role="alert">
        PayPal Checkout could not load. Check the Sandbox client ID and your
        network connection.
      </p>
    );
  }

  return (
    <>
      <paypal-button
        type="pay"
        disabled={session.isPending ? true : undefined}
        onClick={startCheckout}
      />
      {stateName === "idle" ? (
        <p className="checkout-message">
          Sign in with a PayPal Sandbox Personal (buyer) account, never a real
          PayPal login. Hackathon judges: use the test buyer from the Devpost
          testing notes.
        </p>
      ) : null}
    </>
  );
}

export default function PayPalCheckout({ clientId, assessmentId, onReviewExpired }: PayPalCheckoutProps) {
  const [state, setState] = useState<CheckoutState>({ name: "idle" });

  if (state.name === "complete") {
    const { receipt } = state;

    return (
      <div className="receipt" role="status" aria-live="polite">
        <div className="receipt-heading">
          <span className="receipt-check" aria-hidden="true">
            ✓
          </span>
          <div>
            <h3>Sandbox payment captured</h3>
            <p>No real funds moved.</p>
          </div>
        </div>
        <dl>
          <dt>Status</dt>
          <dd>{receipt.status}</dd>
          <dt>Review</dt>
          <dd title={assessmentId}>{assessmentId}</dd>
          <dt>Order</dt>
          <dd title={receipt.orderId}>{receipt.orderId}</dd>
          <dt>Capture</dt>
          <dd title={receipt.captureId}>{receipt.captureId}</dd>
          <dt>Amount</dt>
          <dd>
            {receipt.amount} {receipt.currency}
          </dd>
        </dl>
      </div>
    );
  }

  return (
    <div className="checkout-control">
      <PayPalProvider
        clientId={clientId}
        environment="sandbox"
        components={["paypal-payments"]}
        pageType="checkout"
      >
        <CheckoutButton
          assessmentId={assessmentId}
          stateName={state.name}
          onStateChange={setState}
          onReviewExpired={onReviewExpired}
        />
      </PayPalProvider>

      {state.name === "processing" ? (
        <p className="checkout-message" role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}
      {state.name === "cancelled" ? (
        <p className="checkout-message cancelled" role="status">
          Checkout was cancelled. Nothing was captured; you can try again.
        </p>
      ) : null}
      {state.name === "error" ? (
        <p className="checkout-message error" role="alert">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
