import { describe, expect, it } from "vitest";
import { printerNoticeText } from "./notify-printer";
import { deferPrintUntilPaid, fulfillmentClaim } from "./pending-order";

describe("printer notice", () => {
  it("names the order, the customer and every film file", () => {
    const text = printerNoticeText({
      orderId: "DTF-TEST",
      customer: { name: "Jan", email: "jan@shop.nl" },
      charged: 9.44,
      films: [
        { filmId: "DTF-TEST-1", billedLengthMm: 500 },
        { filmId: "DTF-TEST-2", billedLengthMm: 500 },
      ],
      blobKeys: ["queue/DTF-TEST-1.png", "queue/DTF-TEST-2.png"],
    });
    expect(text).toContain("DTF-TEST");
    expect(text).toContain("jan@shop.nl");
    expect(text).toContain("DTF-TEST-1");
    expect(text).toContain("DTF-TEST-2");
    expect(text).toContain("€9.44");
  });
});

describe("deferPrintUntilPaid", () => {
  it("holds the print file when iDEAL is live", () => {
    expect(deferPrintUntilPaid("live_key", "ideal")).toBe(true);
  });

  it("does not treat a missing Mollie key as a paid print job", () => {
    expect(deferPrintUntilPaid(undefined, "ideal")).toBe(false);
    expect(deferPrintUntilPaid("", "ideal")).toBe(false);
  });
});

describe("fulfillmentClaim", () => {
  it("lets pending and paid orders take the job", () => {
    expect(fulfillmentClaim("pending")).toBe("claim");
    expect(fulfillmentClaim("paid")).toBe("claim");
  });

  it("drops a second webhook while Sharp is still running", () => {
    expect(fulfillmentClaim("fulfilling")).toBe("busy");
  });

  it("drops a webhook after the printer was already notified", () => {
    expect(fulfillmentClaim("fulfilled")).toBe("done");
  });
});
