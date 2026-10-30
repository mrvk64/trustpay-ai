import "server-only";

import { randomUUID } from "node:crypto";
import { OrdersController } from "@paypal/paypal-server-sdk";

import { getPayPalClient } from "@/lib/paypal/config";
import {
  buildCreateOrderRequest,
  isValidPayPalOrderId,
  toCaptureReceipt,
  type CaptureReceipt,
} from "@/lib/paypal/order-data";

function getOrdersController(): OrdersController {
  return new OrdersController(getPayPalClient());
}

export async function createPayPalOrder(assessmentId?: string): Promise<string> {
  const { result } = await getOrdersController().createOrder({
    body: buildCreateOrderRequest(assessmentId),
    paypalRequestId: assessmentId ?? randomUUID(),
    prefer: "return=representation",
  });

  if (!result.id) {
    throw new Error("PayPal order creation returned no order ID.");
  }

  return result.id;
}

export async function capturePayPalOrder(
  orderId: string,
): Promise<CaptureReceipt> {
  if (!isValidPayPalOrderId(orderId)) {
    throw new Error("Invalid PayPal order ID.");
  }

  const { result } = await getOrdersController().captureOrder({
    id: orderId,
    paypalRequestId: `capture-${orderId}`,
    prefer: "return=representation",
  });

  return toCaptureReceipt(result);
}
