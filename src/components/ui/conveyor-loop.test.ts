import { describe, expect, it } from "vitest";
import { CONVEYOR_GLYPHS, CONVEYOR_TRACK } from "./conveyor-glyphs";

describe("ConveyorLoop glyphs", () => {
  it("uses distinct CMYK block colors, not one currentColor", () => {
    expect(CONVEYOR_GLYPHS.map((g) => g.ch)).toEqual(["█", "▓", "▒"]);
    expect(CONVEYOR_GLYPHS.map((g) => g.color)).toEqual(["#00AEEF", "#E6007E", "#FFD100"]);
    const colors = new Set(CONVEYOR_GLYPHS.map((g) => g.color.toLowerCase()));
    expect(colors.size).toBe(3);
    expect(CONVEYOR_TRACK.ch).toBe("░");
    expect(CONVEYOR_TRACK.color).toBe("#E8E8E8");
  });
});
