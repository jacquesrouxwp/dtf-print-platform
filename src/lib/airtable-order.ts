import { isPngQueueRef } from "./queue-files";

const DEFAULT_BASE = "appPzXK54vI427vDL";
const DEFAULT_TABLE = "Заказы плёнки";
const TEST_STATUS = "тест/ожидает";

export type FilmOrderRow = {
  orderId: string;
  status: string;
  customer: { name?: string; email?: string };
  charged: number;
  billedMeters: number;
  files: string[];
  test: boolean;
};

type AirtableField = { name: string; type: string };
type AirtableTable = { id: string; name: string; fields: AirtableField[] };

/** Live «Заказы плёнки» columns (this PAT cannot read schema.bases). */
const FALLBACK_FIELDS: AirtableField[] = [
  { name: "№", type: "singleLineText" },
  { name: "Статус", type: "singleSelect" },
  { name: "Клиент", type: "singleLineText" },
  { name: "Сумма", type: "number" },
  { name: "Метры", type: "number" },
  { name: "Файл", type: "singleLineText" },
  { name: "Оплата", type: "singleSelect" },
];

function token() {
  return process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_PAT || "";
}

function baseId() {
  return process.env.AIRTABLE_BASE_ID || DEFAULT_BASE;
}

function tableName() {
  return process.env.AIRTABLE_TABLE || DEFAULT_TABLE;
}

function pickField(fields: AirtableField[], patterns: RegExp[]) {
  for (const re of patterns) {
    const hit = fields.find((f) => re.test(f.name));
    if (hit) return hit;
  }
  return null;
}

function pngFileValue(files: string[]): string | undefined {
  return files.find(isPngQueueRef) ?? files[0];
}

function extraFileValue(files: string[]): string {
  return files.filter((f) => !isPngQueueRef(f)).join("\n");
}

export function fieldsForFilmOrder(fields: AirtableField[], row: FilmOrderRow): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const set = (patterns: RegExp[], value: unknown) => {
    const hit = pickField(fields, patterns);
    if (hit && value !== undefined && value !== "") out[hit.name] = value;
  };
  set([/^№$/, /^заказ$/i, /order\s*id/i, /^номер/i, /^#$/, /order/i], row.orderId);
  set([/^статус$/i, /^status$/i], row.status);
  const emailField = pickField(fields, [/^email$/i, /почта/i, /e-mail/i]);
  const nameField = pickField(fields, [/^имя$/i, /^name$/i, /клиент/i, /customer/i]);
  if (emailField && row.customer.email) out[emailField.name] = row.customer.email;
  if (nameField) {
    const name =
      emailField || !row.customer.email
        ? row.customer.name
        : [row.customer.name, row.customer.email].filter(Boolean).join(" ");
    if (name) out[nameField.name] = name;
  }
  set([/^сумма$/i, /total/i, /charged/i, /цена/i], row.charged);
  set([/^метры$/i, /meter/i, /длина/i, /length/i], row.billedMeters);
  const fileField = pickField(fields, [/^файлы?$/i, /^files$/i, /png/i]);
  if (fileField && row.files.length) {
    const multiline = fileField.type === "multilineText";
    out[fileField.name] = multiline ? row.files.join("\n") : pngFileValue(row.files);
  }
  set([/^оплат/i, /^payment$/i], row.test ? "ожидает" : "оплачен");
  const notesField = pickField(fields, [/^заметк/i, /^notes$/i, /коммент/i]);
  if (notesField) {
    const bits = [
      row.test ? "тест" : "",
      fileField && fileField.type !== "multilineText" ? extraFileValue(row.files) : "",
    ].filter(Boolean);
    if (bits.length) out[notesField.name] = bits.join("\n");
  }
  return out;
}

async function airtable(path: string, init?: RequestInit) {
  const key = token();
  if (!key) return null;
  const res = await fetch(`https://api.airtable.com/v0/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as { error?: { message?: string }; tables?: AirtableTable[]; id?: string };
  if (!res.ok) {
    throw new Error(json.error?.message || `airtable_${res.status}`);
  }
  return json;
}

export async function recordFilmOrder(row: FilmOrderRow): Promise<{ ok: boolean; id?: string; via: string }> {
  if (!token()) return { ok: false, via: "skipped" };
  const base = baseId();
  const wanted = tableName();
  const fields = fieldsForFilmOrder(FALLBACK_FIELDS, {
    ...row,
    status: row.test ? TEST_STATUS : row.status || "ожидает",
  });
  if (!Object.keys(fields).length) {
    fields["№"] = row.orderId;
    fields["Статус"] = TEST_STATUS;
  }
  try {
    const created = await airtable(`${base}/${encodeURIComponent(wanted)}`, {
      method: "POST",
      body: JSON.stringify({ fields, typecast: true }),
    });
    return { ok: true, id: created?.id, via: "airtable" };
  } catch (first) {
    let fieldNames: AirtableField[] = FALLBACK_FIELDS;
    try {
      const meta = await airtable(`meta/bases/${base}/tables`);
      const table = meta?.tables?.find((t) => t.name === wanted);
      fieldNames = table?.fields?.length ? table.fields : FALLBACK_FIELDS;
    } catch {
      throw first;
    }
    const retry = fieldsForFilmOrder(fieldNames, {
      ...row,
      status: row.test ? TEST_STATUS : row.status || "ожидает",
    });
    const created = await airtable(`${base}/${encodeURIComponent(wanted)}`, {
      method: "POST",
      body: JSON.stringify({ fields: retry, typecast: true }),
    });
    return { ok: true, id: created?.id, via: "airtable" };
  }
}
