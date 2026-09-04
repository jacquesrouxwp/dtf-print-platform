export function NestPreview({ label }: { label: string }) {
  return (
    <div>
      <p className="num mb-3 text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <svg viewBox="0 0 550 280" className="w-full" role="img" aria-label="55 cm roll">
        <rect x="1" y="1" width="548" height="278" fill="#fdfdfd" stroke="#e6e6e6" />
        <rect x="24" y="28" width="80" height="80" fill="#111111" />
        <rect x="114" y="28" width="180" height="54" fill="#00aeef" />
        <rect x="304" y="28" width="60" height="60" fill="#111111" />
        <rect x="374" y="28" width="150" height="50" fill="#111111" />
        <rect x="24" y="118" width="70" height="88" fill="#111111" />
        <rect x="104" y="118" width="70" height="88" fill="#111111" />
        <rect x="184" y="118" width="80" height="80" fill="#111111" />
        <rect x="274" y="118" width="60" height="60" fill="#111111" />
        <line x1="1" y1="230" x2="549" y2="230" stroke="#e6e6e6" strokeDasharray="6 4" />
        <text x="16" y="258" fill="#5a5a5a" fontFamily="Liberation Sans, Arial, sans-serif" fontSize="16">
          55 cm · 0.8 m
        </text>
      </svg>
    </div>
  );
}
