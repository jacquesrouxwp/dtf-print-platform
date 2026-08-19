import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultConfig } from "../lib/site-config";

vi.mock("../lib/local-artwork", async () => {
  const actual = await vi.importActual<typeof import("../lib/local-artwork")>("../lib/local-artwork");
  return {
    ...actual,
    localImageMeta: async () => ({ src: "blob:local-preview", pixelW: 300, pixelH: 150 }),
  };
});

describe("addFiles", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 500, statusText: "Internal Server Error" }))
    );
  });

  it("still places a local preview when /api/upload returns an empty 500", async () => {
    const { useBuilderStore } = await import("./useBuilderStore");
    useBuilderStore.setState({
      designs: [],
      placed: [],
      lengthMm: 0,
      rejected: [],
      selectedId: null,
      adding: false,
      history: [],
      future: [],
      canUndo: false,
      canRedo: false,
    });
    const file = new File([new Uint8Array([137, 80, 78, 71])], "logo.png", { type: "image/png" });
    await useBuilderStore.getState().addFiles([file], defaultConfig);
    const state = useBuilderStore.getState();
    expect(state.designs).toHaveLength(1);
    expect(state.designs[0].src).toBe("blob:local-preview");
    expect(state.designs[0].uploadError).toBeTruthy();
    expect(state.placed).toHaveLength(1);
    expect(state.placed[0].widthMm).toBeGreaterThan(0);
    expect(state.adding).toBe(false);
  });
});
