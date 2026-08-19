import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { POST } from "./route";

describe("POST /api/upload", () => {
  it("returns JSON 400 when no file is sent", async () => {
    const res = await POST(
      new Request("http://local/api/upload", { method: "POST", body: new FormData() })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBeTruthy();
  });

  it("never returns an empty 500 for a valid PNG", async () => {
    const buf = await sharp({
      create: { width: 40, height: 20, channels: 4, background: { r: 226, g: 43, b: 18, alpha: 1 } },
    })
      .png()
      .toBuffer();
    const form = new FormData();
    form.append("file", new File([new Uint8Array(buf)], "mark.png", { type: "image/png" }));
    const res = await POST(new Request("http://local/api/upload", { method: "POST", body: form }));
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
    if (res.status !== 200) throw new Error(`upload ${res.status}: ${text}`);
    const body = JSON.parse(text) as { widthMm?: number; error?: string };
    expect(body.widthMm).toBeGreaterThan(0);
  });
});
