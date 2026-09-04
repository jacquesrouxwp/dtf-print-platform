import { describe, expect, it } from "vitest";
import { fieldsForFilmOrder } from "./airtable-order";

const png =
  "https://www.dtfstudio.site/api/files?key=queue/DTF-TEST-1.png";
const pdf =
  "https://www.dtfstudio.site/api/files?key=queue/DTF-TEST-1-operator.pdf";
const json =
  "https://www.dtfstudio.site/api/files?key=queue/DTF-TEST-1.json";

const row = {
  orderId: "DTF-TEST-1",
  status: "тест/ожидает",
  customer: { name: "Ilya", email: "ilya@test.nl" },
  charged: 12.1,
  billedMeters: 0.5,
  files: [png, pdf, json],
  test: true,
};

describe("airtable film order fields", () => {
  it("maps onto Заказы плёнки column names", () => {
    const fields = fieldsForFilmOrder(
      [
        { name: "Заказ", type: "singleLineText" },
        { name: "Статус", type: "singleSelect" },
        { name: "Email", type: "email" },
        { name: "Имя", type: "singleLineText" },
        { name: "Сумма", type: "number" },
        { name: "Метры", type: "number" },
        { name: "Файлы", type: "multilineText" },
      ],
      row
    );
    expect(fields["Заказ"]).toBe("DTF-TEST-1");
    expect(fields["Статус"]).toBe("тест/ожидает");
    expect(fields["Email"]).toBe("ilya@test.nl");
    expect(fields["Имя"]).toBe("Ilya");
    expect(fields["Файлы"]).toBe([png, pdf, json].join("\n"));
  });

  it("writes only the PNG https URL into live single-line Файл", () => {
    const fields = fieldsForFilmOrder(
      [
        { name: "№", type: "singleLineText" },
        { name: "Статус", type: "singleSelect" },
        { name: "Клиент", type: "singleLineText" },
        { name: "Сумма", type: "number" },
        { name: "Метры", type: "number" },
        { name: "Файл", type: "singleLineText" },
        { name: "Оплата", type: "singleSelect" },
      ],
      row
    );
    expect(fields["№"]).toBe("DTF-TEST-1");
    expect(fields["Статус"]).toBe("тест/ожидает");
    expect(fields["Клиент"]).toBe("Ilya ilya@test.nl");
    expect(fields["Сумма"]).toBe(12.1);
    expect(fields["Метры"]).toBe(0.5);
    expect(fields["Файл"]).toBe(png);
    expect(String(fields["Файл"])).not.toContain(".pdf");
    expect(fields["Оплата"]).toBe("ожидает");
  });

  it("parks PDF/JSON URLs in notes when Файл is single-line", () => {
    const fields = fieldsForFilmOrder(
      [
        { name: "Файл", type: "singleLineText" },
        { name: "Заметки", type: "multilineText" },
      ],
      row
    );
    expect(fields["Файл"]).toBe(png);
    expect(fields["Заметки"]).toContain(pdf);
    expect(fields["Заметки"]).toContain(json);
    expect(fields["Заметки"]).toContain("тест");
  });
});
