import {
  CaptureStatus,
  CheckoutPaymentIntent,
  type Order,
  OrderStatus,
  type OrderRequest,
} from "@paypal/paypal-server-sdk";

import { DEMO_PRODUCT } from "@/lib/demo-product";

export type CaptureReceipt = {
  orderId: string;
  status: string;
  captureId: string;
  amount: string;
  currency: string;
};

export function buildCreateOrderRequest(assessmentId?: string): OrderRequest {
  return {
    intent: CheckoutPaymentIntent.Capture,
    purchaseUnits: [
      {
        referenceId: DEMO_PRODUCT.sku,
        description: DEMO_PRODUCT.name,
        customId: assessmentId ?? DEMO_PRODUCT.sku,
        amount: {
          currencyCode: DEMO_PRODUCT.currency,
          value: DEMO_PRODUCT.price,
        },
      },
    ],
  };
}

export function isValidPayPalOrderId(orderId: string): boolean {
  return /^[A-Z0-9]{8,64}$/.test(orderId);
}

export function toCaptureReceipt(order: Order): CaptureReceipt {
  if (!order.id) {
    throw new Error("PayPal capture response did not include an order ID.");
  }

  const capture = order.purchaseUnits?.[0]?.payments?.captures?.[0];

  if (order.status !== OrderStatus.Completed) {
    throw new Error("PayPal order capture is not complete.");
  }

  if (!capture?.id || capture.status !== CaptureStatus.Completed) {
    throw new Error("PayPal response did not include a completed capture.");
  }

  if (
    capture.amount?.value !== DEMO_PRODUCT.price ||
    capture.amount.currencyCode !== DEMO_PRODUCT.currency
  ) {
    throw new Error("PayPal capture amount did not match the expected order.");
  }

  return {
    orderId: order.id,
    status: capture.status,
    captureId: capture.id,
    amount: capture.amount.value,
    currency: capture.amount.currencyCode,
  };
}
