import { cn } from "@/lib/utils";
import { CONVEYOR_GLYPHS, conveyorBeltUnits } from "./conveyor-glyphs";

const BELT = conveyorBeltUnits();

export { CONVEYOR_GLYPHS };

export function ConveyorLoop({
  className,
  duration = "1.15s",
}: {
  className?: string;
  duration?: string;
}) {
  return (
    <div
      className={cn(
        "conveyor-loop overflow-hidden font-mono text-2xl leading-none tracking-[0.12em] select-none",
        className
      )}
      aria-hidden
    >
      <div className="conveyor-loop-track flex w-max" style={{ animationDuration: duration }}>
        {[0, 1].map((copy) => (
          <span key={copy} className="flex shrink-0">
            {BELT.map((u, i) => (
              <span
                key={`${copy}-${i}`}
                className={`conveyor-glyph conveyor-glyph-${u.kind}`}
              >
                {u.ch}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
