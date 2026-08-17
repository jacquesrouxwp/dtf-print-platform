"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "./providers";

type Field = "name" | "email" | "company" | "phone" | "kvk" | "message" | "address" | "city" | "postcode";

export function LeadForm({
  endpoint,
  fields,
  submitLabel,
  success,
}: {
  endpoint: string;
  fields: Field[];
  submitLabel: string;
  success: string;
}) {
  const { t } = useI18n();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return <p className="border border-rule bg-paper-2 p-6 text-sm">{success}</p>;
  }

  const labels: Record<Field, string> = {
    name: t.common.name,
    email: t.common.email,
    company: t.common.company,
    phone: t.common.phone,
    kvk: t.common.kvk,
    message: t.common.message,
    address: t.common.address,
    city: t.common.city,
    postcode: t.common.postcode,
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {fields.map((field) =>
        field === "message" ? (
          <label key={field} className="grid gap-1 text-sm">
            {labels[field]}
            <textarea
              name={field}
              required
              rows={5}
              className="border border-rule bg-paper px-3 py-2"
            />
          </label>
        ) : (
          <label key={field} className="grid gap-1 text-sm">
            {labels[field]}
            <input
              name={field}
              type={field === "email" ? "email" : "text"}
              required={field === "name" || field === "email"}
              className="border border-rule bg-paper px-3 py-2"
            />
          </label>
        )
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="bg-accent px-5 py-3 text-sm text-white"
      >
        {status === "sending" ? t.common.sending : submitLabel}
      </button>
    </form>
  );
}
