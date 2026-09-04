import { putObject } from "./storage";

export type PrinterNotice = {
  orderId: string;
  customer: {
    name?: string;
    email?: string;
    company?: string;
    address?: string;
    postcode?: string;
    city?: string;
  };
  charged: number;
  films: { filmId: string; billedLengthMm: number }[];
  blobKeys: string[];
};

export function printerNoticeText(notice: PrinterNotice): string {
  const ship = [notice.customer.address, notice.customer.postcode, notice.customer.city]
    .filter(Boolean)
    .join(", ");
  const lines = [
    `New paid DTF Studio order ${notice.orderId}`,
    `Customer: ${notice.customer.name || "—"} <${notice.customer.email || "—"}>`,
    notice.customer.company ? `Company: ${notice.customer.company}` : "",
    ship ? `Ship: ${ship}` : "Ship: pickup / none",
    `Charged: €${notice.charged.toFixed(2)} incl. BTW`,
    `Films: ${notice.films.length}`,
    ...notice.films.map(
      (f) => `  ${f.filmId}  billed ${(f.billedLengthMm / 1000).toFixed(3)} m`
    ),
    "Files:",
    ...notice.blobKeys.map((k) => `  ${k}`),
  ].filter(Boolean);
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
    const from = process.env.PRINT_FROM_EMAIL || "DTF Studio <jacqrodtf@gmail.com>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `DTF Studio print queue ${notice.orderId}`,
        text: body,
      }),
    });
    if (!res.ok) return { sent: false, via: "blob" };
    return { sent: true, via: "resend" };
  } catch {
    return { sent: false, via: "blob" };
  }
}
