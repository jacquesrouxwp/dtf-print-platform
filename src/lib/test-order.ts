import { createHash, timingSafeEqual } from "crypto";

export function testOrdersEnabled(): boolean {
  const flag = process.env.ENABLE_TEST_ORDER?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

export function testOrderKeyOk(provided: unknown): boolean {
  if (!testOrdersEnabled()) return false;
  const expected = process.env.TEST_ORDER_KEY;
  if (!expected || typeof provided !== "string" || provided.length < 8) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function testKeyFromRequest(request: Request, body?: { testKey?: unknown }): string | undefined {
  const header = request.headers.get("x-test-order-key");
  if (header) return header;
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("test");
    if (q) return q;
  } catch {
    /* ignore */
  }
  if (typeof body?.testKey === "string") return body.testKey;
  return undefined;
}
