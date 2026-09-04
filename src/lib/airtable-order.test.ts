import { describe, expect, it } from "vitest";
import { fieldsForFilmOrder } from "./airtable-order";

const row = {
  orderId: "DTF-TEST-1",
  status: "тест/ожидает",
  customer: { name: "Ilya", email: "ilya@test.nl" },
  charged: 12.1,
  billedMeters: 0.5,
  files: ["queue/DTF-TEST-1.png"],
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
    expect(fields["Файлы"]).toContain("queue/DTF-TEST-1.png");
  });

  it("maps onto the live № / Клиент / Файл / Оплата columns", () => {
    const fields = fieldsForFilmOrder(
      [
        { name: "№", type: "singleLineText" },
        { name: "Статус", type: "singleSelect" },
        { name: "Клиент", type: "singleLineText" },
        { name: "Сумма", type: "number" },
        { name: "Метры", type: "number" },
        { name: "Файл", type: "multilineText" },
        { name: "Оплата", type: "singleSelect" },
      ],
      row
    );
    expect(fields["№"]).toBe("DTF-TEST-1");
    expect(fields["Статус"]).toBe("тест/ожидает");
    expect(fields["Клиент"]).toBe("Ilya ilya@test.nl");
    expect(fields["Сумма"]).toBe(12.1);
    expect(fields["Метры"]).toBe(0.5);
    expect(fields["Файл"]).toContain("queue/DTF-TEST-1.png");
    expect(fields["Оплата"]).toBe("ожидает");
  });
});
