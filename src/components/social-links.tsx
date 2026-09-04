const socials = [
  {
    href: "https://www.instagram.com/dtf_print_studio/",
    label: "@dtf_print_studio",
    icon: "instagram",
  },
  {
    href: "https://x.com/dtf_print_eu",
    label: "@dtf_print_eu",
    icon: "x",
  },
  {
    href: "https://www.pinterest.com/dtf_studio/",
    label: "dtf_studio",
    icon: "pinterest",
  },
] as const;

function Icon({ name }: { name: (typeof socials)[number]["icon"] }) {
  if (name === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (name === "pinterest") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M13.2 7.6c-2.8 0-4.2 1.9-4.2 3.6 0 1 .5 1.9 1.6 2.2.2 0 .3-.1.3-.2l.1-.5c0-.2 0-.3-.1-.4-.3-.4-.5-.8-.5-1.2 0-1.6 1.2-3 3.1-3 1.7 0 2.6 1 2.6 2.4 0 1.8-.8 3.3-2 3.3-.7 0-1.1-.5-1-1.1l.3-1.4c.1-.4.2-.8.2-1.1 0-.7-.4-1.1-1-1.1-.8 0-1.4.8-1.4 1.9 0 .4.1.7.2 1L10 17.8c-.2.8-.1 1.8 0 2.6.1 0 .2 0 .2-.1.6-.8 1.1-1.9 1.3-2.7l.5-2c.3.5.9.8 1.6.8 2.1 0 3.5-1.9 3.5-4.5 0-1.9-1.6-3.7-4.9-3.7Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        d="M17.8 4H20l-5.5 6.3L21 20h-4.7l-3.7-4.8L8.2 20H6l5.9-6.7L4.2 4h4.8l3.3 4.4L17.8 4Zm-1.6 14.4h1.3L7.9 5.5H6.5l9.7 12.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SocialLinks() {
  return (
    <ul className="flex items-center gap-3">
      {socials.map((s) => (
        <li key={s.href}>
          <a
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.label}
            title={s.label}
            className="text-ink hover:text-[#00AEEF]"
          >
            <Icon name={s.icon} />
          </a>
        </li>
      ))}
    </ul>
  );
}
