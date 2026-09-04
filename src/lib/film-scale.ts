/**
 * How many screen pixels one millimetre of film gets.
 *
 * The camera is deliberately blind to what is *on* the film. It sees the box it
 * is drawn in, the width of the roll and the zoom the customer set — nothing
 * else. Feed it the film's length or the selected piece and a customer editing
 * one sticker would watch the whole roll jump under their thumb.
 */
export function filmScale(input: {
  boxWidthPx: number;
  rollWidthMm: number;
  zoomPct: number;
  rulerPx: number;
  surroundPx: number;
}): number {
  const { boxWidthPx, rollWidthMm, zoomPct, rulerPx, surroundPx } = input;
  const avail = Math.max(0, boxWidthPx - rulerPx - surroundPx * 2);
  if (avail <= 0 || rollWidthMm <= 0) return 0;
  const fit = avail / rollWidthMm;
  return fit * (clampZoom(zoomPct) / 100);
}

export function clampZoom(zoomPct: number): number {
  if (!Number.isFinite(zoomPct)) return 100;
  return Math.max(25, Math.min(zoomPct, 400));
}

/** A phone cannot spare 74px of a 390px screen on rulers and margins. */
export function filmChrome(boxWidthPx: number): { rulerPx: number; surroundPx: number } {
  return boxWidthPx < 500 ? { rulerPx: 14, surroundPx: 6 } : { rulerPx: 26, surroundPx: 24 };
}
