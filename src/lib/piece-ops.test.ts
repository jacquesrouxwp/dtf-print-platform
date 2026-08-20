import { describe, expect, it } from "vitest";
import { alignedPosition, duplicateOffset, overlappingIds, overlaps } from "./piece-ops";
import type { PlacedPiece } from "./nesting";

const USABLE = 530;
const EDGE = 10;

function box(xMm: number, yMm: number, widthMm = 100, heightMm = 80) {
  return { xMm, yMm, widthMm, heightMm };
}

function piece(id: string, xMm: number, yMm: number, widthMm = 100, heightMm = 80): PlacedPiece {
  return { id, designId: "d", xMm, yMm, widthMm, heightMm, rotation: 0, locked: true };
}

describe("duplicateOffset", () => {
  it("puts the copy beside the original, not under it", () => {
    const at = duplicateOffset(box(20, 30), USABLE, 4, EDGE);
    expect(at.xMm).toBeGreaterThan(20);
    expect(at.yMm).toBeGreaterThan(30);
  });

  it("keeps the copy inside the printable width", () => {
    const wide = box(EDGE + USABLE - 100, 30);
    const at = duplicateOffset(wide, USABLE, 4, EDGE);
    expect(at.xMm + 100).toBeLessThanOrEqual(EDGE + USABLE);
  });

  it("never places a copy above the top edge", () => {
    const at = duplicateOffset(box(0, 0), USABLE, 4, EDGE);
    expect(at.yMm).toBeGreaterThanOrEqual(EDGE);
  });
});

describe("alignedPosition", () => {
  it("snaps left and right to the printable edges", () => {
    expect(alignedPosition(box(200, 50), USABLE, EDGE, "left").xMm).toBe(EDGE);
    expect(alignedPosition(box(200, 50), USABLE, EDGE, "right").xMm).toBe(EDGE + USABLE - 100);
  });

  it("centres horizontally within the printable width", () => {
    const at = alignedPosition(box(0, 50), USABLE, EDGE, "center");
    const leftGap = at.xMm - EDGE;
    const rightGap = EDGE + USABLE - (at.xMm + 100);
    expect(leftGap).toBeCloseTo(rightGap, 6);
  });

  it("keeps the other axis untouched", () => {
    expect(alignedPosition(box(200, 77), USABLE, EDGE, "left").yMm).toBe(77);
    expect(alignedPosition(box(200, 77), USABLE, EDGE, "top").xMm).toBe(200);
  });

  it("does not push a piece wider than the film off the left edge", () => {
    const huge = box(0, 20, USABLE + 200);
    expect(alignedPosition(huge, USABLE, EDGE, "right").xMm).toBe(EDGE);
  });
});

describe("overlap detection", () => {
  it("reports pieces that share film", () => {
    expect(overlaps(box(0, 0), box(50, 40))).toBe(true);
  });

  it("treats touching edges as clear", () => {
    expect(overlaps(box(0, 0), box(100, 0))).toBe(false);
  });

  it("names every piece involved in a collision", () => {
    const ids = overlappingIds([piece("a", 0, 0), piece("b", 50, 40), piece("c", 400, 0)]);
    expect(ids.sort()).toEqual(["a", "b"]);
  });

  it("says nothing when the layout is clean", () => {
    expect(overlappingIds([piece("a", 0, 0), piece("b", 200, 0)])).toEqual([]);
  });
});
