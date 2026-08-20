import { authoritativeOrderQuote } from "./order-quote";
import { notifyPrinter } from "./notify-printer";
import { loadPendingOrder, savePendingOrder, type PendingOrder } from "./pending-order";
import { writeProductionQueue } from "./print-output";
import { rollFromSite } from "./roll";
import { getServerConfig } from "./server-config";
import { getObject } from "./storage";

export async function fulfillPaidOrder(order: PendingOrder) {
  if (order.status === "fulfilled") {
    return { orderId: order.orderId, already: true, films: [] as { filmId: string }[] };
  }

  const config = await getServerConfig();
  const quoted = authoritativeOrderQuote(order.films, config, {
    trade: order.trade,
    rush: order.rush,
    includeShipping: !order.pickup,
  });

  const images = new Map<string, Buffer>();
  const trims = new Map<string, { x: number; y: number; w: number; h: number }>();
  for (const film of order.films) {
    for (const src of film.sources) {
      if (src.storageKey && !images.has(src.designId)) {
        const buf = await getObject(src.storageKey);
        if (buf) images.set(src.designId, buf);
      }
      if (src.trimBox && src.trimBox.w > 0) trims.set(src.designId, src.trimBox);
    }
  }

  if (images.size === 0) {
    throw new Error("artwork_missing");
  }

  const written: { filmId: string; billedLengthMm: number; blobKeys: string[] }[] = [];
  for (const [i, film] of quoted.films.entries()) {
    const filmId = quoted.films.length > 1 ? `${order.orderId}-${i + 1}` : order.orderId;
    await writeProductionQueue({
      orderId: filmId,
      roll: rollFromSite(config),
      layout: film.layout,
      customer: order.customer,
      priceExVat: film.quote.subtotalExcl,
      images,
      trims,
    });
    written.push({
      filmId,
      billedLengthMm: film.layout.billedLengthMm,
      blobKeys: [
        `queue/${filmId}.png`,
        `queue/${filmId}-operator.pdf`,
        `queue/${filmId}.json`,
      ],
    });
  }

  await notifyPrinter({
    orderId: order.orderId,
    customer: order.customer,
    charged: order.charged,
    films: written.map((f) => ({ filmId: f.filmId, billedLengthMm: f.billedLengthMm })),
    blobKeys: written.flatMap((f) => f.blobKeys),
  });

  await savePendingOrder({
    ...order,
    status: "fulfilled",
    fulfilledAt: new Date().toISOString(),
  });

  return { orderId: order.orderId, already: false, films: written };
}

export async function fulfillOrderId(orderId: string) {
  const pending = await loadPendingOrder(orderId);
  if (!pending) return null;
  return fulfillPaidOrder(pending);
}
