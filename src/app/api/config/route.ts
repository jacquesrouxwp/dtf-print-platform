import { NextResponse } from "next/server";
import {
  checkAdmin,
  getServerConfig,
  saveServerConfig,
} from "@/lib/server-config";
import { defaultConfig, type SiteConfig } from "@/lib/site-config";
import { testKeyFromRequest, testOrderKeyOk } from "@/lib/test-order";

export async function GET(request: Request) {
  const config = await getServerConfig();
  const testKey = testKeyFromRequest(request);
  return NextResponse.json({
    config,
    mollie: Boolean(process.env.MOLLIE_API_KEY),
    testOrder: testOrderKeyOk(testKey),
  });
}

export async function PUT(request: Request) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as Partial<SiteConfig>;
  const next = { ...defaultConfig, ...body };
  await saveServerConfig(next);
  return NextResponse.json({ config: next });
}
