const FALLBACK_SITE = "https://www.dtfstudio.site";

export function siteBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "").replace(/\/+$/, "");
  if (raw && !/\.vercel\.app$/i.test(raw)) return raw;
  return FALLBACK_SITE;
}

/** Absolute studio URL for a print-queue object. Slash in `key` stays readable. */
export function queueFileUrl(key: string): string {
  const trimmed = key.replace(/^\/+/, "");
  return `${siteBaseUrl()}/api/files?key=${trimmed}`;
}

export function isPngQueueRef(ref: string): boolean {
  const fromQuery = /(?:\?|&)key=([^&]+)/i.exec(ref)?.[1];
  const path = decodeURIComponent(fromQuery || ref.split("?")[0]);
  return /\.png$/i.test(path);
}

export function contentTypeForQueueKey(key: string): string {
  const base = key.split("?")[0].toLowerCase();
  if (base.endsWith(".png")) return "image/png";
  if (base.endsWith(".pdf")) return "application/pdf";
  if (base.endsWith(".json")) return "application/json; charset=utf-8";
  if (base.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

export function filenameForQueueKey(key: string): string {
  const base = key.split("?")[0];
  const name = base.split("/").filter(Boolean).pop();
  return name || "file";
}

/** Reject path traversal and anything that is not a queue/upload key. */
export function safeQueueKey(raw: string | null): string | null {
  if (!raw) return null;
  const key = raw.replace(/^\/+/, "").replace(/\\/g, "/");
  if (!key || key.includes("..")) return null;
  if (!/^[a-zA-Z0-9._/-]+$/.test(key)) return null;
  return key;
}
