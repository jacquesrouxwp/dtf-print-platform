import { beforeEach, describe, expect, it, vi } from "vitest";

function installStorage() {
  const map = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    },
  });
  return map;
}

const line = {
  id: "a",
  lengthMm: 500,
  billedMeters: 0.5,
  rate: 11,
  subtotalExcl: 5.5,
  trade: false,
  rush: false,
  designs: [{ id: "d1", name: "logo.png", qty: 2, widthMm: 80, heightMm: 80 }],
  placed: [],
  createdAt: "2026-09-03T00:00:00.000Z",
};

describe("cart fingerprint", () => {
  beforeEach(() => {
    vi.resetModules();
    installStorage();
  });

  it("treats the same layout as one line", async () => {
    const { useCartStore, cartFingerprint } = await import("./useCartStore");
    expect(cartFingerprint(line)).toBe(
      cartFingerprint({ lengthMm: line.lengthMm, designs: line.designs })
    );
    useCartStore.getState().addLine(line);
    useCartStore.getState().addLine({ ...line, id: "b", createdAt: "later" });
    expect(useCartStore.getState().lines).toHaveLength(1);
  });

  it("keeps two films that only differ by gap", async () => {
    const { useCartStore } = await import("./useCartStore");
    useCartStore.getState().addLine({ ...line, gapMm: 4 });
    useCartStore.getState().addLine({ ...line, id: "b", gapMm: 12, createdAt: "later" });
    expect(useCartStore.getState().lines).toHaveLength(2);
  });

  it("adopts hlv-cart once, then drops the old key", async () => {
    const map = installStorage();
    map.set(
      "hlv-cart",
      JSON.stringify({
        state: { lines: [line], drafts: [] },
        version: 0,
      })
    );
    const { useCartStore } = await import("./useCartStore");
    await useCartStore.persist.rehydrate();
    expect(useCartStore.getState().lines).toHaveLength(1);
    expect(map.has("hlv-cart")).toBe(false);
    expect(map.has("dtf-cart")).toBe(true);
  });
});
