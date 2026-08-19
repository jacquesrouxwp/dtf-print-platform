import { describe, expect, it } from "vitest";
import { persistableSrc, readResponseJson } from "./local-artwork";

describe("persistableSrc", () => {
  it("drops blob and data URLs so localStorage cannot store the image", () => {
    expect(persistableSrc("blob:https://x/1")).toBe("");
    expect(persistableSrc("data:image/png;base64,abc")).toBe("");
    expect(persistableSrc("data:,")).toBe("");
  });

  it("keeps file-server keys and https URLs", () => {
    expect(persistableSrc("/api/files?key=fs:a.png")).toBe("/api/files?key=fs:a.png");
    expect(persistableSrc("https://blob.vercel-storage.com/a.png")).toBe(
      "https://blob.vercel-storage.com/a.png"
    );
  });
});

describe("readResponseJson", () => {
  it("does not throw on an empty 500 body", async () => {
    const res = new Response("", { status: 500 });
    expect(await readResponseJson(res)).toEqual({ error: "http 500" });
  });

  it("returns parsed JSON", async () => {
    const res = new Response(JSON.stringify({ id: "a" }), { status: 200 });
    expect(await readResponseJson(res)).toEqual({ id: "a" });
  });
});
