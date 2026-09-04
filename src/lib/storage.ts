import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { contentTypeForQueueKey } from "./queue-files";

const DIR = path.join(
  process.env.VERCEL ? "/tmp" : process.cwd(),
  ".data",
  "uploads"
);

function blobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

function isOwnBlobUrl(ref: string): boolean {
  try {
    const u = new URL(ref);
    return u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function putObject(key: string, data: Buffer): Promise<string> {
  const token = blobToken();
  if (token) {
    const { put } = await import("@vercel/blob");
    await put(`hlv/${key}`, data, {
      access: "private",
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: contentTypeForQueueKey(key),
    });
    return key;
  }
  await mkdir(DIR, { recursive: true });
  const safe = key.replace(/[^a-zA-Z0-9._/-]/g, "_");
  const full = path.join(DIR, safe);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return key;
}

export async function getObject(ref: string): Promise<Buffer | null> {
  try {
    if (ref.startsWith("http")) {
      if (!isOwnBlobUrl(ref)) return null;
      const headers: Record<string, string> = {};
      const token = blobToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(ref, { headers });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    }
    if (ref.startsWith("fs:")) {
      return await readFile(path.join(DIR, ref.slice(3)));
    }
    const token = blobToken();
    if (token) {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: `hlv/${ref}`, token });
      const hit = blobs.find((b) => b.pathname === `hlv/${ref}` || b.pathname.endsWith(`/${ref}`));
      if (hit?.url) return await getObject(hit.url);
    }
    return await readFile(path.join(DIR, ref));
  } catch {
    return null;
  }
}
