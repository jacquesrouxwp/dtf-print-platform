import { describe, expect, it } from "vitest";
import { getObject, putObject } from "./storage";

describe("storage", () => {
  it("getObject returns null for a missing key instead of throwing", async () => {
    await expect(getObject("fs:does-not-exist.png")).resolves.toBeNull();
    await expect(getObject("config.json")).resolves.toBeNull();
  });

  it("round-trips a png into local storage", async () => {
    const key = await putObject("audit-probe.png", Buffer.from([1, 2, 3, 4]));
    expect(key).toBe("audit-probe.png");
    await expect(getObject("https://evil.example/steal")).resolves.toBeNull();
    const got = await getObject(key);
    expect(got?.equals(Buffer.from([1, 2, 3, 4]))).toBe(true);
  });
});
