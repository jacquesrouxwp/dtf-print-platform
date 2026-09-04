import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/files", () => {
  it("returns 400 without a key", async () => {
    const res = await GET(new Request("http://local/api/files"));
    expect(res.status).toBe(400);
  });

  it("rejects path traversal", async () => {
    const res = await GET(new Request("http://local/api/files?key=../secret.png"));
    expect(res.status).toBe(400);
  });

  it("returns 404 for a missing queue object", async () => {
    const res = await GET(
      new Request("http://local/api/files?key=queue/DTF-DOES-NOT-EXIST.png")
    );
    expect(res.status).toBe(404);
  });
});
