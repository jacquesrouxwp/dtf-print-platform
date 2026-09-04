/** When ENABLE_TEST_ORDER is on, every checkout is a labelled test order — no secret URL. */
export function testOrdersEnabled(): boolean {
  const flag = process.env.ENABLE_TEST_ORDER?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}
