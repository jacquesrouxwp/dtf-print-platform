/**
 * "1 плёнки" is the kind of detail that makes an interface feel unfinished.
 * Russian needs three forms; Dutch and English need two.
 */
export function filmsLabel(count: number, locale: string): string {
  const n = Math.abs(Math.trunc(count));
  if (locale === "ru") {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "плёнка";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "плёнки";
    return "плёнок";
  }
  if (locale === "nl") return n === 1 ? "film" : "films";
  return n === 1 ? "film" : "films";
}

export function filmsCount(count: number, locale: string): string {
  return `${count} ${filmsLabel(count, locale)}`;
}
