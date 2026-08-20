import { describe, expect, it } from "vitest";
import { POST } from "./route";

function piece(id: string) {
  return {
    designId: id,
    widthMm: 200,
    heightMm: 150,
    qty: 1,
    instances: [
      { id: `${id}1`, locked: true, xMm: 10, yMm: 10, rotation: 0, widthMm: 200, heightMm: 150 },
    ],
  };
}

async function post(body: unknown) {
  const res = await POST(
    new Request("http://localhost/api/price", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  return res.json();
}

describe("POST /api/price", () => {
  it("prices two films as two films", async () => {
    const two = await post({
      films: [
        { id: "A", items: [piece("a")] },
        { id: "B", items: [piece("b")] },
      ],
      includeShipping: false,
    });
    const one = await post({ films: [{ id: "A", items: [piece("a")] }], includeShipping: false });

    expect(two.films).toHaveLength(2);
    expect(two.quote.subtotalExcl).toBeCloseTo(one.quote.subtotalExcl * 2, 2);
  });

  it("still accepts a flat item list as a single film", async () => {
    const flat = await post({ items: [piece("a")], includeShipping: false });
    expect(flat.billedLengthMm).toBeGreaterThan(0);
    expect(flat.items).toHaveLength(1);
  });

  it("returns zero for an empty order instead of the minimum charge", async () => {
    const empty = await post({ films: [], includeShipping: true });
    expect(empty.quote.totalIncl).toBe(0);
    expect(empty.quote.shipping).toBe(0);
  });
});
