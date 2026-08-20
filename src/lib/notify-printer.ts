import { putObject } from "./storage";

export type PrinterNotice = {
  orderId: string;
  customer: { name?: string; email?: string };
  charged: number;
  films: { filmId: string; billedLengthMm: number }[];
  blobKeys: string[];
};

export function printerNoticeText(notice: PrinterNotice): string {
  const lines = [
    `New paid HLV order ${notice.orderId}`,
    `Customer: ${notice.customer.name || "—"} <${notice.customer.email || "—"}>`,
    `Charged: €${notice.charged.toFixed(2)} incl. BTW`,
    `Films: ${notice.films.length}`,
    ...notice.films.map(
      (f) => `  ${f.filmId}  billed ${(f.billedLengthMm / 1000).toFixed(3)} m`
    ),
    "Files:",
    ...notice.blobKeys.map((k) => `  ${k}`),
  ];
  return lines.join("\n");
}

/**
 * Tell the shop a paid order is ready to print.
 * Prefers Resend when RESEND_API_KEY is set; always writes a Blob copy so a
 * missed inbox is not a missed job.
 */
export async function notifyPrinter(notice: PrinterNotice): Promise<{ sent: boolean; via: string }> {
  const body = printerNoticeText(notice);
  await putObject(
    `queue/${notice.orderId}-notify.txt`,
    Buffer.from(body, "utf8")
  );

  const to = process.env.PRINT_NOTIFY_EMAIL || process.env.SHOP_EMAIL;
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) {
    return { sent: false, via: "blob" };
  }

  try {
    const from = process.env.PRINT_FROM_EMAIL || "HLV <orders@hlv.film>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `HLV print queue ${notice.orderId}`,
        text: body,
      }),
    });
    if (!res.ok) return { sent: false, via: "blob" };
    return { sent: true, via: "resend" };
  } catch {
    return { sent: false, via: "blob" };
  }
}
