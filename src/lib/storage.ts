import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const DIR = path.join(process.cwd(), ".data", "uploads");

export async function putObject(key: string, data: Buffer): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`hlv/${key}`, data, {
      access: "private",
      token,
      addRandomSuffix: false,
    });
    return blob.url;
  }
  await mkdir(DIR, { recursive: true });
  const safe = key.replace(/[^a-zA-Z0-9._-]/g, "_");
  await writeFile(path.join(DIR, safe), data);
  return `fs:${safe}`;
}

export async function getObject(ref: string): Promise<Buffer | null> {
  try {
    if (ref.startsWith("http")) {
      const res = await fetch(ref, {
        headers: process.env.BLOB_READ_WRITE_TOKEN
          ? { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
          : undefined,
      });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    }
    if (ref.startsWith("fs:")) {
      return readFile(path.join(DIR, ref.slice(3)));
    }
    return readFile(path.join(DIR, ref));
  } catch {
    return null;
  }
}
