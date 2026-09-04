import { afterEach, describe, expect, it } from "vitest";
import { testOrdersEnabled } from "./test-order";

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
