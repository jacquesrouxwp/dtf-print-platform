import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { defaultConfig, type SiteConfig } from "./site-config";

const FILE = path.join(process.cwd(), ".data", "config.json");

export function adminPassword() {
  return process.env.ADMIN_PASSWORD || "hlv-admin";
}

export function checkAdmin(request: Request) {
  const header =
    request.headers.get("x-admin-password") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === adminPassword();
}

export async function getServerConfig(): Promise<SiteConfig> {
  try {
    const raw = await readFile(FILE, "utf8");
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch {
    return defaultConfig;
  }
}

export async function saveServerConfig(config: SiteConfig) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(config, null, 2));
}
