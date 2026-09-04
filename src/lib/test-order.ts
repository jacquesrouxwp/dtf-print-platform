/** When ENABLE_TEST_ORDER is on, every checkout is a labelled test order — no secret URL. */
export function testOrdersEnabled(): boolean {
  const flag = process.env.ENABLE_TEST_ORDER?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

/** Staff tests always get DTF-TEST-*. Client DTF- ids must not steal that prefix. */
export function assignOrderId(staffTest: boolean, clientId?: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  if (staffTest) return `DTF-TEST-${stamp}`;
  if (typeof clientId === "string" && /^(DTF|HLV)-/.test(clientId) && !clientId.startsWith("DTF-TEST-")) {
    return clientId;
  }
  return `DTF-${stamp}`;
}
