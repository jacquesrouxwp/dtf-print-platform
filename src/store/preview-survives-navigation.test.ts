import { describe, expect, it, beforeEach, vi } from "vitest";

/**
 * Switching language is a full navigation to /ru/order, so the builder store
 * is rebuilt from localStorage. A design whose only preview was a blob: URL
 * came back with nothing to render — the customer sees their file vanish.
 */

const SERVER_PREVIEW = "/api/files?key=abc-preview.png";

function persistedWith(src: string, previewUrl?: string) {
  return JSON.stringify({
    version: 2,
    state: {
      designs: [
        {
          id: "d1",
          name: "logo.png",
          src,
          previewUrl,
          storageKey: "hlv/abc.bin",
          mime: "image/png",
          pixelW: 1200,
          pixelH: 600,
          widthMm: 200,
          heightMm: 100,
          aspectRatio: 2,
          qty: 1,
          warnings: [],
          allowRotate: true,
        },
      ],
      placed: [],
      lengthMm: 500,
      rejected: [],
    },
  });
}

function installStorage(blob: string) {
  const map = new Map<string, string>([["hlv-builder", blob]]);
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    },
  });
  return map;
}

describe("artwork preview across navigation", () => {
  beforeEach(() => vi.resetModules());

  it("falls back to the server preview when the blob URL is gone", async () => {
    installStorage(persistedWith("blob:https://site/9f2c", SERVER_PREVIEW));
    const { useBuilderStore } = await import("./useBuilderStore");
    await useBuilderStore.persist.rehydrate();
    const [design] = useBuilderStore.getState().designs;
    expect(design).toBeDefined();
    expect(design.src).toBe(SERVER_PREVIEW);
  });

  it("keeps a durable src as it is", async () => {
    installStorage(persistedWith(SERVER_PREVIEW, SERVER_PREVIEW));
    const { useBuilderStore } = await import("./useBuilderStore");
    await useBuilderStore.persist.rehydrate();
    expect(useBuilderStore.getState().designs[0].src).toBe(SERVER_PREVIEW);
  });

  it("still drops a blob URL that has no server preview behind it", async () => {
    installStorage(persistedWith("blob:https://site/9f2c", undefined));
    const { useBuilderStore } = await import("./useBuilderStore");
    await useBuilderStore.persist.rehydrate();
    const [design] = useBuilderStore.getState().designs;
    // Nothing to show, but the design must survive with its size intact
    // rather than crashing the page.
    expect(design.src).toBe("");
    expect(design.widthMm).toBe(200);
  });

  it("writes the durable preview back to storage, not the blob URL", async () => {
    const map = installStorage(persistedWith("blob:https://site/9f2c", SERVER_PREVIEW));
    const { useBuilderStore } = await import("./useBuilderStore");
    await useBuilderStore.persist.rehydrate();
    useBuilderStore.getState().select("d1");
    const written = JSON.parse(map.get("hlv-builder") as string);
    expect(written.state.designs[0].src).toBe(SERVER_PREVIEW);
    expect(written.state.designs[0].src.startsWith("blob:")).toBe(false);
  });
});
