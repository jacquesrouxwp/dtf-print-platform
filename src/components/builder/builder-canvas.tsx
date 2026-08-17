"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Image as KImage, Layer, Line, Rect, Stage, Text } from "react-konva";
import { useBuilderStore } from "@/store/useBuilderStore";
import { useSettingsStore } from "@/store/useSettingsStore";

export function BuilderCanvas({ interactive }: { interactive: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(480);
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
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const scale = width / config.rollWidthMm;
  const viewLength = Math.max(lengthMm + 40, 280);
  const height = Math.max(200, viewLength * scale);

  const images = useMemo(() => {
    const map = new Map<string, HTMLImageElement>();
    for (const d of designs) {
      if (!d.src) continue;
      const img = new window.Image();
      img.src = d.src;
      map.set(d.id, img);
    }
    return map;
  }, [designs]);

  return (
    <div ref={wrapRef} className="checker w-full overflow-auto border border-rule">
      <Stage width={width} height={height}>
        <Layer>
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="#f7f4ec"
          />
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
            return (
              <KImage
                key={p.id}
                image={img}
                x={p.xMm * scale}
                y={p.yMm * scale}
                width={p.widthMm * scale}
                height={p.heightMm * scale}
                opacity={design?.src ? 1 : 0.85}
                fill={design?.src ? undefined : "#12110e"}
                stroke={selected ? "#e22b12" : "#12110e"}
                strokeWidth={selected ? 2 : 0.5}
                draggable={interactive && !p.locked}
                onClick={() => select(p.designId)}
                onTap={() => select(p.designId)}
                onDragEnd={(e) => {
                  movePiece(
                    p.id,
                    e.target.x() / scale,
                    e.target.y() / scale,
                    config
                  );
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
  );
}
