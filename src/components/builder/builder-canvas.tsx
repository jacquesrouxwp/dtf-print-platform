"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Image as KImage, Layer, Line, Rect, Stage, Text } from "react-konva";
import { useBuilderStore } from "@/store/useBuilderStore";
import { useSettingsStore } from "@/store/useSettingsStore";

export function BuilderCanvas({ interactive }: { interactive: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(480);
  const [tick, setTick] = useState(0);
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
    const ro = new ResizeObserver(() => {
      const next = el.clientWidth;
      setWidth((w) => (w === next ? w : next));
    });
    ro.observe(el);
    setWidth((w) => (w === el.clientWidth ? w : el.clientWidth));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const apply = () => setFinePointer(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const viewLength = Math.max(lengthMm + 40, 280);
  const fitScale = Math.min(width / config.rollWidthMm, 560 / viewLength);
  const scale = fit ? Math.max(0.02, fitScale) : width / config.rollWidthMm;
  const height = Math.max(200, Math.min(viewLength * scale, 2400));

  const images = useMemo(() => {
    const map = new Map<string, HTMLImageElement>();
    for (const d of designs) {
      if (!d.src || d.src === "data:," || d.src.startsWith("data:,")) continue;
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setTick((n) => n + 1);
      img.src = d.src;
      map.set(d.id, img);
    }
    return map;
  }, [designs]);

  void tick;

  const canDrag = interactive && finePointer;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span className="num">{Math.round(scale * config.rollWidthMm)} px wide</span>
        <button
          type="button"
          className="underline"
          onClick={() => setFit((v) => !v)}
        >
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
              width={(config.rollWidthMm - 2 * config.edgeMm) * scale}
              height={Math.max(lengthMm - 2 * config.edgeMm, 20) * scale}
              stroke="#d4cec0"
              dash={[4, 4]}
            />
            {placed.map((p) => {
              const design = designs.find((d) => d.id === p.designId);
              const img = images.get(p.designId);
              const selected = selectedId === p.designId || selectedId === p.id;
              const rotated = p.rotation === 90;
              const drawW = (rotated ? p.heightMm : p.widthMm) * scale;
              const drawH = (rotated ? p.widthMm : p.heightMm) * scale;
              return (
                <KImage
                  key={p.id}
                  image={img}
                  x={p.xMm * scale + (rotated ? p.widthMm * scale : 0)}
                  y={p.yMm * scale}
                  width={drawW}
                  height={drawH}
                  rotation={rotated ? 90 : 0}
                  opacity={design?.src ? 1 : 0.85}
                  fill={design?.src ? undefined : "#12110e"}
                  stroke={selected ? "#e22b12" : "#12110e"}
                  strokeWidth={selected ? 2 : 0.5}
                  draggable={canDrag && !p.locked}
                  onClick={() => select(p.designId)}
                  onTap={() => select(p.designId)}
                  onDragEnd={(e) => {
                    const node = e.target;
                    const rot = p.rotation === 90;
                    const x = rot ? node.x() - p.widthMm * scale : node.x();
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
