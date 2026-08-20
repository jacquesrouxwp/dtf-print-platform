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

export type OrderStatus = "pending" | "paid" | "fulfilling" | "fulfilled";

export type PendingOrder = {
  orderId: string;
  status: OrderStatus;
  films: PendingFilm[];
  customer: { name?: string; email?: string };
  trade: boolean;
  rush: boolean;
  pickup: boolean;
  charged: number;
  createdAt: string;
  fulfilledAt?: string;
};

export type ClaimResult =
  | { ok: true; order: PendingOrder }
  | { ok: false; reason: "missing" | "busy" | "done" };

/** Whether a second webhook should skip, or try to take the job. */
export function fulfillmentClaim(status: OrderStatus): "claim" | "busy" | "done" {
  if (status === "fulfilled") return "done";
  if (status === "fulfilling") return "busy";
  return "claim";
}

/**
 * Mark the order fulfilling before Sharp starts. Blob is not atomic, so this
 * only shrinks the race — a second webhook that already read `paid` can still
 * slip through, but not one that arrives after this write.
 */
export async function claimForFulfillment(orderId: string): Promise<ClaimResult> {
  const current = await loadPendingOrder(orderId);
  if (!current) return { ok: false, reason: "missing" };
  const gate = fulfillmentClaim(current.status);
  if (gate === "done") return { ok: false, reason: "done" };
  if (gate === "busy") return { ok: false, reason: "busy" };
  const claimed: PendingOrder = { ...current, status: "fulfilling" };
  await savePendingOrder(claimed);
  return { ok: true, order: claimed };
}

export async function releaseFulfillmentClaim(order: PendingOrder): Promise<void> {
  await savePendingOrder({ ...order, status: "paid" });
}

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
