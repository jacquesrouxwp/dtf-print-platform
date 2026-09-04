import { describe, expect, it } from "vitest";
import { fieldsForFilmOrder } from "./airtable-order";

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
      {
        orderId: "DTF-TEST-1",
        status: "тест/ожидает",
        customer: { name: "Ilya", email: "ilya@test.nl" },
        charged: 12.1,
        billedMeters: 0.5,
        files: ["queue/DTF-TEST-1.png"],
        test: true,
      }
    );
    expect(fields["Заказ"]).toBe("DTF-TEST-1");
    expect(fields["Статус"]).toBe("тест/ожидает");
    expect(fields["Email"]).toBe("ilya@test.nl");
    expect(fields["Файлы"]).toContain("queue/DTF-TEST-1.png");
  });
});
