import type { SiteConfig } from "./site-config";

const TZ = "Europe/Amsterdam";

function partsInZone(date: Date, timeZone = TZ) {
  const tz = timeZone && timeZone.trim() ? timeZone : TZ;
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    });
  } catch {
    fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    });
  }
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: map.weekday,
  };
}

function isWeekend(weekday: string) {
  return weekday === "Sat" || weekday === "Sun";
}

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone = TZ
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const there = partsInZone(guess, timeZone);
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
  const actual = Date.UTC(
    there.year,
    there.month - 1,
    there.day,
    there.hour,
    there.minute,
    there.second
  );
  return new Date(guess.getTime() + (desired - actual));
}

function addDays(y: number, m: number, d: number, days: number) {
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}

export function nextCutoffAt(config: SiteConfig, now = new Date()): Date {
  const nowP = partsInZone(now, config.timezone);
  let y = nowP.year;
  let m = nowP.month;
  let d = nowP.day;
  let weekday = nowP.weekday;

  const pastCutoff =
    nowP.hour > config.cutoffHour ||
    (nowP.hour === config.cutoffHour && nowP.minute >= config.cutoffMinute);

  if (isWeekend(weekday) || pastCutoff) {
    do {
      const next = addDays(y, m, d, 1);
      y = next.year;
      m = next.month;
      d = next.day;
      const probe = zonedTimeToUtc(y, m, d, 12, 0, config.timezone);
      weekday = partsInZone(probe, config.timezone).weekday;
    } while (isWeekend(weekday));
  }

  return zonedTimeToUtc(y, m, d, config.cutoffHour, config.cutoffMinute, config.timezone);
}

export function remainingToCutoff(config: SiteConfig, now = new Date()) {
  const target = nextCutoffAt(config, now);
  const ms = Math.max(0, target.getTime() - now.getTime());
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const sameDay =
    partsInZone(now, config.timezone).day ===
      partsInZone(target, config.timezone).day &&
    partsInZone(now, config.timezone).month ===
      partsInZone(target, config.timezone).month;
  return { ms, hours, minutes, target, sameDay };
}

export function formatRemaining(hours: number, minutes: number, locale: string) {
  if (locale === "nl") return `${hours}u ${minutes}m`;
  if (locale === "ru") return `${hours} ч ${minutes} мин`;
  return `${hours}h ${minutes}m`;
}
