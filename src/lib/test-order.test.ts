import { afterEach, describe, expect, it } from "vitest";
import { assignOrderId, testOrdersEnabled } from "./test-order";

describe("test checkout gate", () => {
  afterEach(() => {
    delete process.env.ENABLE_TEST_ORDER;
  });

  it("is off unless ENABLE_TEST_ORDER is set", () => {
    expect(testOrdersEnabled()).toBe(false);
  });

  it("is on for every visitor when the flag is set", () => {
    process.env.ENABLE_TEST_ORDER = "1";
    expect(testOrdersEnabled()).toBe(true);
  });
});

describe("assignOrderId", () => {
  it("ignores a client DTF- id on staff test checkout", () => {
    const id = assignOrderId(true, "DTF-MTMWZ760");
    expect(id.startsWith("DTF-TEST-")).toBe(true);
  });

  it("keeps a real client id when this is not a test order", () => {
    expect(assignOrderId(false, "DTF-PAID1")).toBe("DTF-PAID1");
  });
});
