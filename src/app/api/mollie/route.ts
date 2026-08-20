import { NextResponse } from "next/server";
import { fulfillOrderId } from "@/lib/fulfill-order";
import { loadPendingOrder, savePendingOrder } from "@/lib/pending-order";

export const runtime = "nodejs";

/**
 * Mollie POSTs { id } when a payment changes. We refetch the payment — never
 * trust the body — and only then write print files and ping the shop.
 */
export async function POST(request: Request) {
  const key = process.env.MOLLIE_API_KEY;
  if (!key) return NextResponse.json({ error: "mollie_disabled" }, { status: 503 });

  let paymentId = "";
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { id?: string };
      paymentId = typeof body.id === "string" ? body.id : "";
    } else {
      const form = await request.formData();
      paymentId = String(form.get("id") || "");
    }
  } catch {
    return NextResponse.json({ error: "bad_body" }, { status: 400 });
  }
  if (!paymentId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const res = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return NextResponse.json({ error: "payment_lookup" }, { status: 502 });
  const payment = (await res.json()) as {
    status?: string;
    metadata?: { orderId?: string };
  };

  const orderId = payment.metadata?.orderId;
  if (!orderId) return NextResponse.json({ ok: true, ignored: "no_order" });

  if (payment.status !== "paid") {
    return NextResponse.json({ ok: true, ignored: payment.status });
  }

  const pending = await loadPendingOrder(orderId);
  if (!pending) return NextResponse.json({ error: "unknown_order" }, { status: 404 });

  if (pending.status !== "fulfilled") {
    await savePendingOrder({ ...pending, status: "paid" });
  }

  try {
    await fulfillOrderId(orderId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "fulfill_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, orderId, paid: true });
}
