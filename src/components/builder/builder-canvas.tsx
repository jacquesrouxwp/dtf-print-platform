"use client";

import { useEffect, useRef, useState } from "react";
import { Image as KImage, Layer, Line, Rect, Stage, Text } from "react-konva";
import { useBuilderStore } from "@/store/useBuilderStore";
import { useSettingsStore } from "@/store/useSettingsStore";

function usableSrc(src?: string) {
  return Boolean(src && !src.startsWith("data:,"));
}

export function BuilderCanvas({ interactive }: { interactive: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(480);
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});
  const [finePointer, setFinePointer] = useState(false);
  const [fit, setFit] = useState(true);
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
      const next = Math.max(120, Math.floor(el.clientWidth));
      setWidth((w) => (w === next ? w : next));
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
  const fitScale = Math.min(width / roll, 560 / viewLength);
  const scale = fit ? Math.max(0.02, fitScale) : width / roll;
  const height = Math.max(200, Math.min(viewLength * scale, 1600));
  const canDrag = interactive && finePointer;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span className="num">{Math.round(scale * roll)} px wide</span>
        <button type="button" className="underline" onClick={() => setFit((v) => !v)}>
          {fit ? "1:1 width" : "Fit sheet"}
        </button>
      </div>
      <div ref={wrapRef} className="w-full">
        <div className="checker max-h-[70vh] w-full overflow-auto border border-border">
          <Stage width={width} height={height}>
            <Layer>
              <Rect x={0} y={0} width={width} height={height} fill="#f7f4ec" />
              <Rect
                x={config.edgeMm * scale}
                y={config.edgeMm * scale}
                width={(roll - 2 * config.edgeMm) * scale}
                height={Math.max(lengthMm - 2 * config.edgeMm, 20) * scale}
                stroke="#d4cec0"
                dash={[4, 4]}
              />
              {placed.map((p) => {
                const design = designs.find((d) => d.id === p.designId);
                const img = images[p.designId];
                const selected = selectedId === p.designId || selectedId === p.id;
                const rotated = p.rotation === 90;
                const boxW = Math.max(1, p.widthMm * scale);
                const boxH = Math.max(1, p.heightMm * scale);
                const drawW = rotated ? boxH : boxW;
                const drawH = rotated ? boxW : boxH;
                return (
                  <KImage
                    key={p.id}
                    image={img}
                    x={p.xMm * scale + (rotated ? boxW : 0)}
                    y={p.yMm * scale}
                    width={drawW}
                    height={drawH}
                    rotation={rotated ? 90 : 0}
                    opacity={usableSrc(design?.src) ? 1 : 0.85}
                    fill={usableSrc(design?.src) ? undefined : "#12110e"}
                    stroke={selected ? "#e22b12" : "#12110e"}
                    strokeWidth={selected ? 2 : 0.5}
                    draggable={canDrag && !p.locked}
                    onClick={() => select(p.designId)}
                    onTap={() => select(p.designId)}
                    onDragEnd={(e) => {
                      const node = e.target;
                      const x = rotated ? node.x() - boxW : node.x();
                      movePiece(p.id, x / scale, node.y() / scale, config);
                    }}
                  />
                );
              })}
              <Line
                points={[0, lengthMm * scale, width, lengthMm * scale]}
                stroke="#e22b12"
                dash={[8, 6]}
              />
              <Text
                x={8}
                y={Math.max(8, lengthMm * scale - 18)}
                text={`${(lengthMm / 10).toFixed(1)} cm`}
                fill="#e22b12"
                fontFamily="ui-monospace, monospace"
                fontSize={12}
              />
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
}
