import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { defaultConfig, sanitizeConfig, type SiteConfig } from "./site-config";
import { getObject, putObject } from "./storage";

const FILE = path.join(
  process.env.VERCEL ? "/tmp" : process.cwd(),
  ".data",
  "config.json"
);
const BLOB_KEY = "config.json";

export function adminPassword() {
  const fromEnv = process.env.ADMIN_PASSWORD;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  if (process.env.VERCEL) return "";
  return "hlv-admin";
}

export function checkAdmin(request: Request) {
  const expected = adminPassword();
  if (!expected) return false;
  const header =
    request.headers.get("x-admin-password") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === expected;
}

export async function getServerConfig(): Promise<SiteConfig> {
  const fromBlob = await getObject(BLOB_KEY);
  if (fromBlob) {
    try {
      return sanitizeConfig(JSON.parse(fromBlob.toString("utf8")));
    } catch {
      /* fall through */
    }
  }
  try {
    const raw = await readFile(FILE, "utf8");
    return sanitizeConfig(JSON.parse(raw));
  } catch {
    return defaultConfig;
  }
}

export async function saveServerConfig(config: SiteConfig) {
  const clean = sanitizeConfig(config);
  const body = Buffer.from(JSON.stringify(clean, null, 2), "utf8");
  await putObject(BLOB_KEY, body);
  try {
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, body);
  } catch {
    /* blob is enough on Vercel */
  }
}
