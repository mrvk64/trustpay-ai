import { describe, expect, it } from "vitest";
import { CaptureStatus, OrderStatus } from "@paypal/paypal-server-sdk";

import { DEMO_PRODUCT } from "@/lib/demo-product";
import {
  buildCreateOrderRequest,
  isValidPayPalOrderId,
  toCaptureReceipt,
} from "@/lib/paypal/order-data";

describe("PayPal order data", () => {
  it("always creates the order from the server-owned demo product", () => {
    const request = buildCreateOrderRequest();
    const unit = request.purchaseUnits?.[0];

    expect(request.intent).toBe("CAPTURE");
    expect(unit?.amount).toEqual({
      currencyCode: DEMO_PRODUCT.currency,
      value: DEMO_PRODUCT.price,
    });
    expect(unit?.customId).toBe(DEMO_PRODUCT.sku);
  });

  it.each([
    "5O190127TN364715T",
    "8AB12345CD678901E",
    "ORDER123456",
  ])("accepts a plausible PayPal order ID: %s", (orderId) => {
    expect(isValidPayPalOrderId(orderId)).toBe(true);
  });

  it.each(["", "abc", "ORDER/../CAPTURE", "<script>alert(1)</script>"])(
    "rejects an unsafe order ID: %s",
    (orderId) => {
      expect(isValidPayPalOrderId(orderId)).toBe(false);
    },
  );

  it("reduces a capture response to a safe receipt", () => {
    expect(
      toCaptureReceipt({
        id: "5O190127TN364715T",
        status: OrderStatus.Completed,
        purchaseUnits: [
          {
            payments: {
              captures: [
                {
                  id: "3C679366HH908993F",
                  status: CaptureStatus.Completed,
                  amount: { currencyCode: "USD", value: "5.00" },
                },
              ],
            },
          },
        ],
      }),
    ).toEqual({
      orderId: "5O190127TN364715T",
      status: "COMPLETED",
      captureId: "3C679366HH908993F",
      amount: "5.00",
      currency: "USD",
    });
  });

  it("rejects a response without a completed capture", () => {
    expect(() =>
      toCaptureReceipt({
        id: "5O190127TN364715T",
        status: OrderStatus.Approved,
      }),
    ).toThrow("not complete");
  });

  it("rejects a completed capture with the wrong amount", () => {
    expect(() =>
      toCaptureReceipt({
        id: "5O190127TN364715T",
        status: OrderStatus.Completed,
        purchaseUnits: [
          {
            payments: {
              captures: [
                {
                  id: "3C679366HH908993F",
                  status: CaptureStatus.Completed,
                  amount: { currencyCode: "USD", value: "500.00" },
                },
              ],
            },
          },
        ],
      }),
    ).toThrow("did not match");
  });
});
