import { describe, expect, it, beforeEach, vi } from "vitest";

/** A blob written by the pre-v2 build: no `version`, designs without `warnings`. */
const STALE_V1 = JSON.stringify({
  state: {
    designs: [
      { id: "a", name: "logo.png", src: "data:,", pixelW: 1200, widthMm: 200, heightMm: 100, qty: 2 },
    ],
    placed: [{ id: "p1", designId: "a", xMm: 0, yMm: 0 }],
    lengthMm: 700,
  },
});

function installStorage(blob: string | null) {
  const map = new Map<string, string>();
  if (blob) map.set("hlv-builder", blob);
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    },
  });
}

describe("builder store rehydration", () => {
  beforeEach(() => vi.resetModules());

  it("does not crash and yields a warnings array for a stale v1 blob", async () => {
    installStorage(STALE_V1);
    const { useBuilderStore } = await import("./useBuilderStore");
    await useBuilderStore.persist.rehydrate();
    const { designs, rejected } = useBuilderStore.getState();
    expect(designs).toEqual([]);
    expect(Array.isArray(rejected)).toBe(true);
    for (const d of designs) {
      expect(Array.isArray(d.warnings)).toBe(true);
      expect(() => d.warnings.some((w) => w.level === "red")).not.toThrow();
    }
  });

  it("survives a corrupt blob", async () => {
    installStorage('{"state":{"designs":"not-an-array","rejected":null},"version":2}');
    const { useBuilderStore } = await import("./useBuilderStore");
    await useBuilderStore.persist.rehydrate();
    const s = useBuilderStore.getState();
    expect(Array.isArray(s.designs)).toBe(true);
    expect(Array.isArray(s.rejected)).toBe(true);
  });
});
