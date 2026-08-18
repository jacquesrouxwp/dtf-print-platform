"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24">
      <h1 className="font-display text-3xl">Something went wrong.</h1>
      <p className="mt-6 text-muted">
        Reload the page. If it happens again, clear this site&apos;s local storage and retry.
      </p>
      <button
        type="button"
        className="mt-6 bg-accent px-5 py-3 text-sm text-white"
        onClick={() => {
          try {
            window.localStorage.removeItem("hlv-site-config");
          } catch {
            /* ignore */
          }
          reset();
          window.location.reload();
        }}
      >
        Reload
      </button>
    </div>
  );
}
