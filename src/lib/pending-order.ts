import { getObject, putObject } from "./storage";
import type { NestSource } from "./nesting";

export type PendingFilm = {
  id: string;
  sources: Array<
    NestSource & {
      storageKey?: string;
      trimBox?: { x: number; y: number; w: number; h: number };
    }
  >;
};

export type PendingOrder = {
  orderId: string;
  status: "pending" | "paid" | "fulfilled";
  films: PendingFilm[];
  customer: { name?: string; email?: string };
  trade: boolean;
  rush: boolean;
  pickup: boolean;
  charged: number;
  createdAt: string;
  fulfilledAt?: string;
};

function keyOf(orderId: string) {
  return `orders/${orderId}.json`;
}

export async function savePendingOrder(order: PendingOrder): Promise<void> {
  await putObject(keyOf(order.orderId), Buffer.from(JSON.stringify(order), "utf8"));
}

export async function loadPendingOrder(orderId: string): Promise<PendingOrder | null> {
  const buf = await getObject(keyOf(orderId));
  if (!buf) return null;
  try {
    return JSON.parse(buf.toString("utf8")) as PendingOrder;
  } catch {
    return null;
  }
}

/** Live Mollie iDEAL: quote now, print only after the webhook says paid. */
export function deferPrintUntilPaid(mollieKey: string | undefined, method: string): boolean {
  return Boolean(mollieKey) && method === "ideal";
}
