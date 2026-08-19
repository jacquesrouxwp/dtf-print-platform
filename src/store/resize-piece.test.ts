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
    qty: 2,
    warnings: [],
    hasAlpha: true,
    hasSemiTransparency: false,
    whiteBackground: false,
    allowRotate: true,
    ...over,
  };
}

describe("resizePiece", () => {
  beforeEach(() => {
    useBuilderStore.setState({
      designs: [sampleDesign()],
      placed: [
        {
          id: "d:0",
          designId: "d",
          widthMm: 100,
          heightMm: 50,
          xMm: 10,
          yMm: 10,
          rotation: 0,
          locked: false,
        },
        {
          id: "d:1",
          designId: "d",
          widthMm: 100,
          heightMm: 50,
          xMm: 120,
          yMm: 10,
          rotation: 0,
          locked: false,
        },
      ],
      lengthMm: 70,
      rejected: [],
      selectedId: "d:0",
      adding: false,
      history: [],
      future: [],
      canUndo: false,
      canRedo: false,
    });
  });

  it("resizes only the targeted copy and locks it", () => {
    useBuilderStore.getState().resizePiece("d:0", 80, 40, defaultConfig);
    const placed = useBuilderStore.getState().placed;
    expect(placed.find((p) => p.id === "d:0")).toMatchObject({
      widthMm: 80,
      heightMm: 40,
      locked: true,
    });
    expect(placed.find((p) => p.id === "d:1")).toMatchObject({
      widthMm: 100,
      heightMm: 50,
      locked: false,
    });
    expect(useBuilderStore.getState().designs[0].widthMm).toBe(100);
  });

  it("clamps a copy to the usable film width and keeps aspect", () => {
    useBuilderStore.getState().resizePiece("d:0", 900, 450, defaultConfig);
    expect(useBuilderStore.getState().placed.find((p) => p.id === "d:0")).toMatchObject({
      widthMm: 530,
      heightMm: 265,
      locked: true,
    });
  });
});
