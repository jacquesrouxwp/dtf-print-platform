import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const key = process.env.MOLLIE_API_KEY;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (key && body.method === "ideal") {
    const res = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: {
          currency: "EUR",
          value: Number(body.amount).toFixed(2),
        },
        description: `HLV ${body.orderId}`,
        redirectUrl: `${site}/nl/checkout?paid=${body.orderId}`,
        method: "ideal",
        metadata: { orderId: body.orderId },
      }),
    });
    const payment = await res.json();
    if (payment?._links?.checkout?.href) {
      return NextResponse.json({ redirectUrl: payment._links.checkout.href });
    }
  }

  return NextResponse.json({ ok: true, orderId: body.orderId, demo: !key });
}
