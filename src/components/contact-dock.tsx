"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "./providers";
import { useSettingsStore } from "@/store/useSettingsStore";
import { isBuilderPath } from "./app-frame";

/** Digits only — what tel: and wa.me both want. */
function digits(value: string): string {
  return value.replace(/[^\d]/g, "");
}

/**
 * A print shop is a phone-and-WhatsApp business: a customer with a file
 * question wants an answer now, not a contact form. The dock stays out of the
 * builder, where the bottom corner belongs to the tool.
 */
export function ContactDock() {
  const { t } = useI18n();
  const config = useSettingsStore((s) => s.config);
  const pathname = usePathname() ?? "";
  if (isBuilderPath(pathname)) return null;

  const wa = digits(config.whatsapp || config.phone);
  const phone = digits(config.phone);
  const links = [
    wa
      ? {
          key: "whatsapp",
          href: `https://wa.me/${wa}`,
          label: t.contactDock.whatsapp,
          icon: (
            <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.1 14.1c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.7-4.4-3.9-.1-.2-1-1.4-1-2.6 0-1.2.6-1.8.9-2 .2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .6l-.3.4-.3.3c-.1.1-.2.3-.1.5.1.2.6 1 1.3 1.6.9.8 1.6 1 1.8 1.1.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.5-.1l1.8.9c.2.1.4.2.4.3.1.2.1.6-.1 1.2Z" />
          ),
        }
      : null,
    phone
      ? {
          key: "phone",
          href: `tel:+${phone}`,
          label: t.contactDock.phone,
          icon: (
            <path d="M6.6 3h3l1.5 4-2 1.4a12 12 0 0 0 5.5 5.5l1.4-2 4 1.5v3c0 .8-.7 1.6-1.6 1.6A15.4 15.4 0 0 1 3 5.6C3 4.7 3.8 4 4.6 4h2Z" />
          ),
        }
      : null,
    config.email
      ? {
          key: "email",
          href: `mailto:${config.email}`,
          label: t.contactDock.email,
          icon: (
            <path d="M3 5h18v14H3V5Zm2 2v.5l7 4.5 7-4.5V7H5Zm14 3-7 4.5L5 10v7h14v-7Z" />
          ),
        }
      : null,
  ].filter((link): link is NonNullable<typeof link> => Boolean(link));

  if (!links.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2 print:hidden">
      {links.map((link) => (
        <a
          key={link.key}
          href={link.href}
          target={link.key === "whatsapp" ? "_blank" : undefined}
          rel={link.key === "whatsapp" ? "noopener noreferrer" : undefined}
          aria-label={link.label}
          title={link.label}
          className="group flex h-11 w-11 items-center justify-center rounded-sm border border-line bg-paper text-ink shadow-sm transition hover:border-ink"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
            {link.icon}
          </svg>
        </a>
      ))}
    </div>
  );
}
