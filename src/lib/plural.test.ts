import { describe, expect, it } from "vitest";
import { filmsCount, filmsLabel } from "./plural";

describe("filmsLabel (ru)", () => {
  it("uses the singular for one", () => {
    expect(filmsLabel(1, "ru")).toBe("плёнка");
    expect(filmsLabel(21, "ru")).toBe("плёнка");
  });

  it("uses the few form for two to four", () => {
    for (const n of [2, 3, 4, 22, 33]) expect(filmsLabel(n, "ru")).toBe("плёнки");
  });

  it("uses the many form for five and up", () => {
    for (const n of [0, 5, 9, 25, 100]) expect(filmsLabel(n, "ru")).toBe("плёнок");
  });

  it("handles the teens, where the last digit lies", () => {
    for (const n of [11, 12, 13, 14, 111]) expect(filmsLabel(n, "ru")).toBe("плёнок");
  });
});

describe("filmsLabel (en, nl)", () => {
  it("is singular only for one", () => {
    expect(filmsLabel(1, "en")).toBe("film");
    expect(filmsLabel(2, "en")).toBe("films");
    expect(filmsLabel(1, "nl")).toBe("film");
    expect(filmsLabel(0, "nl")).toBe("films");
  });
});

describe("filmsCount", () => {
  it("puts the number in front", () => {
    expect(filmsCount(1, "ru")).toBe("1 плёнка");
    expect(filmsCount(3, "ru")).toBe("3 плёнки");
    expect(filmsCount(7, "en")).toBe("7 films");
  });
});
