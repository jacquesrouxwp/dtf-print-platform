/** Canon (Kirill 2026-09-04): conveyor glyphs, not the site-wide CMYK yellow/magenta. */
export const CONVEYOR_GLYPHS = [
  { ch: "█", varName: "--conveyor-c", color: "#00AEEF", kind: "c" },
  { ch: "▓", varName: "--conveyor-m", color: "#E6007E", kind: "m" },
  { ch: "▒", varName: "--conveyor-y", color: "#FFD100", kind: "y" },
] as const;

export const CONVEYOR_TRACK = { ch: "░", kind: "track" as const, color: "#E8E8E8" };

export function conveyorBeltUnits(repeats = 6) {
  const units: { ch: string; kind: string }[] = [];
  for (let i = 0; i < repeats; i++) {
    for (const g of CONVEYOR_GLYPHS) {
      units.push({ ch: g.ch, kind: g.kind });
      units.push({ ch: CONVEYOR_TRACK.ch, kind: CONVEYOR_TRACK.kind });
    }
  }
  return units;
}
