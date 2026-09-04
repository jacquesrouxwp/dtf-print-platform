import { afterEach, describe, expect, it } from "vitest";
import { testOrderKeyOk, testOrdersEnabled } from "./test-order";

describe("staff test order gate", () => {
  afterEach(() => {
    delete process.env.ENABLE_TEST_ORDER;
    delete process.env.TEST_ORDER_KEY;
  });

  it("is off unless ENABLE_TEST_ORDER is set", () => {
    expect(testOrdersEnabled()).toBe(false);
    expect(testOrderKeyOk("anything-long")).toBe(false);
  });

  it("accepts only the configured key", () => {
    process.env.ENABLE_TEST_ORDER = "1";
    process.env.TEST_ORDER_KEY = "staff-secret-key";
    expect(testOrderKeyOk("staff-secret-key")).toBe(true);
    expect(testOrderKeyOk("wrong-secret-key")).toBe(false);
    expect(testOrderKeyOk("")).toBe(false);
  });
});
