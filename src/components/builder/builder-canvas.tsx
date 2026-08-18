"use client";

import { useEffect, useRef, useState } from "react";
import { Image as KImage, Layer, Line, Rect, Stage, Text } from "react-konva";
import { useBuilderStore } from "@/store/useBuilderStore";
import { useSettingsStore } from "@/store/useSettingsStore";

function usableSrc(src?: string) {
  return Boolean(src && !src.startsWith("data:,"));
}

export function BuilderCanvas({
  interactive,
  zoomPct,
}: {
  interactive: boolean;
  zoomPct: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(0);
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});
  const [finePointer, setFinePointer] = useState(false);
  const config = useSettingsStore((s) => s.config);
  const designs = useBuilderStore((s) => s.designs);
  const placed = useBuilderStore((s) => s.placed);
  const lengthMm = useBuilderStore((s) => s.lengthMm);
  const selectedId = useBuilderStore((s) => s.selectedId);
  const select = useBuilderStore((s) => s.select);
  const movePiece = useBuilderStore((s) => s.movePiece);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => {
      const next = Math.max(80, Math.floor(el.clientWidth));
      setBoxW((w) => (w === next ? w : next));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const apply = () => setFinePointer(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const next: Record<string, HTMLImageElement> = {};
    let pending = 0;
    for (const d of designs) {
      if (!usableSrc(d.src)) continue;
      pending += 1;
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (cancelled) return;
        pending -= 1;
        next[d.id] = img;
        if (pending <= 0) setImages({ ...next });
      };
      img.onerror = () => {
        if (cancelled) return;
        pending -= 1;
        if (pending <= 0) setImages({ ...next });
      };
      img.src = d.src;
    }
    if (pending === 0) setImages({});
    return () => {
      cancelled = true;
    };
  }, [designs]);

  const roll = Math.max(1, config.rollWidthMm);
  const viewLength = Math.max(lengthMm + 40, 280);
  const avail = Math.max(0, boxW);
  const scale = avail > 0 ? (avail / roll) * Math.max(0.5, Math.min(zoomPct, 160) / 100) : 0;
  const stageW = Math.max(1, Math.min(avail || 1, Math.round(roll * scale)));
  const stageH = Math.max(200, Math.min(Math.round(viewLength * (stageW / roll)), 1800));
  const drawScale = stageW / roll;
  const canDrag = interactive && finePointer;

  return (
    <div ref={wrapRef} className="builder-film relative min-w-0 w-full max-w-full overflow-hidden">
      <div className="checker max-h-[62vh] w-full max-w-full overflow-auto rounded-xl">
        {avail > 0 && (
          <Stage width={stageW} height={stageH}>
            <Layer>
              <Rect x={0} y={0} width={stageW} height={stageH} fill="#f7f4ec" />
              <Rect
                x={config.edgeMm * drawScale}
                y={config.edgeMm * drawScale}
                width={(roll - 2 * config.edgeMm) * drawScale}
                height={Math.max(lengthMm - 2 * config.edgeMm, 20) * drawScale}
                stroke="#d4cec0"
                dash={[4, 4]}
              />
              {placed.map((p) => {
                const design = designs.find((d) => d.id === p.designId);
                const img = images[p.designId];
                const selected = selectedId === p.designId || selectedId === p.id;
                const rotated = p.rotation === 90;
                const boxWm = Math.max(1, p.widthMm * drawScale);
                const boxHm = Math.max(1, p.heightMm * drawScale);
                const drawW = rotated ? boxHm : boxWm;
                const drawH = rotated ? boxWm : boxHm;
                const flip = Boolean(p.flipX);
                return (
                  <KImage
                    key={p.id}
                    image={img}
                    x={p.xMm * drawScale + (rotated ? boxWm : 0) + (flip && !rotated ? drawW : 0)}
                    y={p.yMm * drawScale}
                    width={drawW}
                    height={drawH}
                    rotation={rotated ? 90 : 0}
                    scaleX={flip ? -1 : 1}
                    opacity={usableSrc(design?.src) ? 1 : 0.85}
                    fill={usableSrc(design?.src) ? undefined : "#12110e"}
                    stroke={selected ? "#e22b12" : "#12110e"}
                    strokeWidth={selected ? 2 : 0.5}
                    draggable={canDrag && !p.locked}
                    onClick={() => select(p.id)}
                    onTap={() => select(p.id)}
                    onDragEnd={(e) => {
                      const node = e.target;
                      const x = rotated ? node.x() - boxWm : node.x();
                      movePiece(p.id, x / drawScale, node.y() / drawScale, config);
                    }}
                  />
                );
              })}
              <Line
                points={[0, lengthMm * drawScale, stageW, lengthMm * drawScale]}
                stroke="#e22b12"
                dash={[8, 6]}
              />
              <Text
                x={8}
                y={Math.max(8, lengthMm * drawScale - 18)}
                text={`${(lengthMm / 10).toFixed(1)} cm`}
                fill="#e22b12"
                fontFamily="ui-monospace, monospace"
                fontSize={12}
              />
            </Layer>
          </Stage>
        )}
      </div>
    </div>
  );
}
