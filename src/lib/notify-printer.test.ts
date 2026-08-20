import { describe, expect, it } from "vitest";
import { printerNoticeText } from "./notify-printer";
import { deferPrintUntilPaid } from "./pending-order";

describe("printer notice", () => {
  it("names the order, the customer and every film file", () => {
    const text = printerNoticeText({
      orderId: "HLV-TEST",
      customer: { name: "Jan", email: "jan@shop.nl" },
      charged: 9.44,
      films: [
        { filmId: "HLV-TEST-1", billedLengthMm: 500 },
        { filmId: "HLV-TEST-2", billedLengthMm: 500 },
      ],
      blobKeys: ["queue/HLV-TEST-1.png", "queue/HLV-TEST-2.png"],
    });
    expect(text).toContain("HLV-TEST");
    expect(text).toContain("jan@shop.nl");
    expect(text).toContain("HLV-TEST-1");
    expect(text).toContain("HLV-TEST-2");
    expect(text).toContain("€9.44");
  });
});

describe("deferPrintUntilPaid", () => {
  it("holds the print file when iDEAL is live", () => {
    expect(deferPrintUntilPaid("live_key", "ideal")).toBe(true);
  });

  it("prints immediately in demo checkout with no Mollie key", () => {
    expect(deferPrintUntilPaid(undefined, "ideal")).toBe(false);
    expect(deferPrintUntilPaid("", "ideal")).toBe(false);
  });
});
