import { beforeEach, describe, expect, it } from "vitest";
import { defaultConfig } from "../lib/site-config";
import { useBuilderStore, type Design } from "./useBuilderStore";

function sampleDesign(over: Partial<Design> = {}): Design {
  return {
    id: "d",
    name: "logo.png",
    src: "",
    mime: "image/png",
    pixelW: 1000,
    pixelH: 500,
    widthMm: 100,
    heightMm: 50,
    aspectRatio: 2,
    qty: 1,
    warnings: [],
    hasAlpha: true,
    hasSemiTransparency: false,
    whiteBackground: false,
    allowRotate: true,
    ...over,
  };
}

describe("fillWithDesign", () => {
  beforeEach(() => {
    useBuilderStore.setState({
      designs: [sampleDesign()],
      placed: [
        {
          id: "d:0",
          designId: "d",
          widthMm: 80,
          heightMm: 40,
          xMm: 10,
          yMm: 10,
          rotation: 0,
          locked: true,
          flipX: true,
        },
      ],
      lengthMm: 60,
      rejected: [],
      selectedId: "d:0",
      adding: false,
      history: [],
      future: [],
      canUndo: false,
      canRedo: false,
      gapMm: null,
    });
  });

  it("keeps the resized piece size on every fill copy", () => {
    const copies = useBuilderStore.getState().fillWithDesign("d", 1000, defaultConfig);
    expect(copies).toBeGreaterThan(1);
    const placed = useBuilderStore.getState().placed.filter((p) => p.designId === "d");
    expect(placed.length).toBe(copies);
    for (const p of placed) {
      expect(p.widthMm).toBe(80);
      expect(p.heightMm).toBe(40);
      expect(p.flipX).toBe(true);
    }
    expect(useBuilderStore.getState().designs[0].widthMm).toBe(80);
    expect(useBuilderStore.getState().designs[0].heightMm).toBe(40);
  });
});

describe("autoArrange", () => {
  beforeEach(() => {
    useBuilderStore.setState({
      designs: [sampleDesign()],
      placed: [
        {
          id: "d:0",
          designId: "d",
          widthMm: 80,
          heightMm: 40,
          xMm: 40,
          yMm: 80,
          rotation: 0,
          locked: true,
        },
      ],
      lengthMm: 130,
      rejected: [],
      selectedId: "d:0",
      adding: false,
      history: [],
      future: [],
      canUndo: false,
      canRedo: false,
      gapMm: null,
    });
  });

  it("re-nests without resetting a custom piece size", () => {
    useBuilderStore.getState().autoArrange(defaultConfig);
    const piece = useBuilderStore.getState().placed.find((p) => p.id === "d:0");
    expect(piece).toMatchObject({ widthMm: 80, heightMm: 40 });
  });
});
