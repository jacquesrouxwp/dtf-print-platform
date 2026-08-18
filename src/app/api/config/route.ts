import { NextResponse } from "next/server";
import {
  checkAdmin,
  getServerConfig,
  saveServerConfig,
} from "@/lib/server-config";
import { defaultConfig, type SiteConfig } from "@/lib/site-config";

export async function GET() {
  const config = await getServerConfig();
  return NextResponse.json({
    config,
    mollie: Boolean(process.env.MOLLIE_API_KEY),
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
