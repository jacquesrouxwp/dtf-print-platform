"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0f0e0d] text-[#f3efe6]">
        <div style={{ maxWidth: 560, margin: "6rem auto", padding: "0 1rem" }}>
          <h1 style={{ fontSize: 28, fontWeight: 500 }}>Something went wrong.</h1>
          <p style={{ marginTop: 16, opacity: 0.7 }}>
            A client error stopped the page. Reload to continue.
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                window.localStorage.removeItem("hlv-site-config");
              } catch {
                /* ignore */
              }
              reset();
              window.location.reload();
            }}
            style={{
              marginTop: 24,
              background: "#e22b12",
              color: "#fff",
              border: 0,
              padding: "12px 20px",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
