import { describe, expect, it } from "vitest";
import { filmsCount, filmsLabel } from "./plural";

describe("filmsLabel (uk)", () => {
  it("uses the singular for one", () => {
    expect(filmsLabel(1, "uk")).toBe("плівка");
    expect(filmsLabel(21, "uk")).toBe("плівка");
  });

  it("uses the few form for two to four", () => {
    for (const n of [2, 3, 4, 22, 33]) expect(filmsLabel(n, "uk")).toBe("плівки");
  });

  it("uses the many form for five and up", () => {
    for (const n of [0, 5, 9, 25, 100]) expect(filmsLabel(n, "uk")).toBe("плівок");
  });

  it("handles the teens, where the last digit lies", () => {
    for (const n of [11, 12, 13, 14, 111]) expect(filmsLabel(n, "uk")).toBe("плівок");
  });
});

describe("filmsLabel (en, nl, de, fr, ar)", () => {
  it("is singular only for one", () => {
    expect(filmsLabel(1, "en")).toBe("film");
    expect(filmsLabel(2, "en")).toBe("films");
    expect(filmsLabel(1, "nl")).toBe("film");
    expect(filmsLabel(0, "nl")).toBe("films");
    expect(filmsLabel(1, "de")).toBe("Film");
    expect(filmsLabel(2, "de")).toBe("Filme");
    expect(filmsLabel(1, "fr")).toBe("film");
    expect(filmsLabel(2, "fr")).toBe("films");
    expect(filmsLabel(1, "ar")).toBe("فيلم");
    expect(filmsLabel(3, "ar")).toBe("أفلام");
  });
});

describe("filmsCount", () => {
  it("puts the number in front", () => {
    expect(filmsCount(1, "uk")).toBe("1 плівка");
    expect(filmsCount(3, "uk")).toBe("3 плівки");
    expect(filmsCount(7, "en")).toBe("7 films");
  });
});
