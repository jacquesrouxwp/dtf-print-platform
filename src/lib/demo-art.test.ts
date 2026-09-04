import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEMO_FILENAMES } from "./demo-art";

describe("demo art", () => {
  it("does not use Hilversum or HLV in sample names or canvas text", () => {
    const src = readFileSync(new URL("./demo-art.ts", import.meta.url), "utf8");
    expect(src).not.toMatch(/hilversum|hlv/i);
    expect(DEMO_FILENAMES.join(" ")).not.toMatch(/hilversum|hlv/i);
  });
});
