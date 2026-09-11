/** Hairline process arrow: a rule with a sharp head, like a crop mark. */
function ProcessArrow() {
  return (
    <>
      <svg
        viewBox="0 0 100 12"
        preserveAspectRatio="none"
        className="hidden h-3 w-full text-ink md:block"
        fill="none"
      >
        <path
          d="M0 6h86"
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M82 2.25 96 6 82 9.75"
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <svg viewBox="0 0 12 48" className="h-12 w-3 text-ink md:hidden" fill="none">
        <path d="M6 0v36" stroke="currentColor" strokeWidth="1" />
        <path d="M2.25 32 6 46 9.75 32" stroke="currentColor" strokeWidth="1" />
      </svg>
    </>
  );
}

export function HomeProcess({
  kicker,
  steps,
}: {
  kicker: string;
  steps: { n: string; t: string }[];
}) {
  return (
    <section className="w-full border-y border-line">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:py-14">
        <p className="num text-xs uppercase tracking-[0.2em] text-muted">{kicker}</p>
        <ol className="mt-8 flex flex-col md:flex-row md:items-center">
          {steps.flatMap((step, i) => {
            const nodes = [
              <li key={step.n} className="min-w-0 flex-1">
                <p className="num text-xs text-muted">{step.n}</p>
                <h2 className="font-display mt-2 text-3xl leading-none tracking-tight md:text-4xl">
                  {step.t}
                </h2>
              </li>,
            ];
            if (i < steps.length - 1) {
              nodes.push(
                <li
                  key={`${step.n}-to`}
                  className="flex items-center justify-center py-3 md:w-28 md:px-4 md:py-0 lg:w-48 lg:px-6"
                  aria-hidden
                >
                  <ProcessArrow />
                </li>
              );
            }
            return nodes;
          })}
        </ol>
      </div>
    </section>
  );
}
