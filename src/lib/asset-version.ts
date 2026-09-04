/** Bump when locked brand PNGs change so Vercel/CDN cannot serve stale bytes. */
export const ASSET_VERSION = "20260904c";

export function branded(path: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}v=${ASSET_VERSION}`;
}
