"use client";

import { useEffect, useRef, useState } from "react";
import { Group, Image as KImage, Layer, Line, Rect, Stage, Text } from "react-konva";
import { useBuilderStore } from "@/store/useBuilderStore";
import { useSettingsStore } from "@/store/useSettingsStore";

function usableSrc(src?: string) {
  return Boolean(src && !src.startsWith("data:,"));
}

/** Fine, warm, print-studio alpha grid. Not the Photoshop magenta/grey. */
function makeAlphaSwatch(cell = 6): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = cell * 2;
  c.height = cell * 2;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.fillStyle = "#e4ddd0";
  ctx.fillRect(0, 0, cell * 2, cell * 2);
  ctx.fillStyle = "#c8c0b2";
  ctx.fillRect(0, 0, cell, cell);
  ctx.fillRect(cell, cell, cell, cell);
  return c;
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
  const [swatch, setSwatch] = useState<HTMLImageElement | null>(null);
  const config = useSettingsStore((s) => s.config);
  const designs = useBuilderStore((s) => s.designs);
  const placed = useBuilderStore((s) => s.placed);
  const lengthMm = useBuilderStore((s) => s.lengthMm);
  const selectedId = useBuilderStore((s) => s.selectedId);
  const select = useBuilderStore((s) => s.select);
  const movePiece = useBuilderStore((s) => s.movePiece);
  const removePiece = useBuilderStore((s) => s.removePiece);

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
    const tile = makeAlphaSwatch(8);
    const img = new window.Image();
    img.onload = () => setSwatch(img);
    img.src = tile.toDataURL("image/png");
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
      <div className="max-h-[62vh] w-full max-w-full overflow-auto rounded-xl bg-[#161412]">
        {avail > 0 && (
          <Stage width={stageW} height={stageH}>
            <Layer>
              {swatch ? (
                <Rect
                  x={0}
                  y={0}
                  width={stageW}
                  height={stageH}
                  fillPatternImage={swatch}
                  fillPatternRepeat="repeat"
                  listening={false}
                />
              ) : (
                <Rect x={0} y={0} width={stageW} height={stageH} fill="#efe8db" />
              )}
              <Rect
                x={config.edgeMm * drawScale}
                y={config.edgeMm * drawScale}
                width={(roll - 2 * config.edgeMm) * drawScale}
                height={Math.max(lengthMm - 2 * config.edgeMm, 20) * drawScale}
                stroke="#c9c1b3"
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
                const ox = p.xMm * drawScale;
                const oy = p.yMm * drawScale;
                return (
                  <Group
                    key={p.id}
                    x={ox}
                    y={oy}
                    clipX={0}
                    clipY={0}
                    clipWidth={boxWm}
                    clipHeight={boxHm}
                    draggable={canDrag && !p.locked}
                    onClick={(e) => {
                      const ev = e.evt;
                      if (ev.ctrlKey || ev.metaKey) {
                        e.cancelBubble = true;
                        removePiece(p.id, config);
                        return;
                      }
                      select(p.id);
                    }}
                    onTap={() => select(p.id)}
                    onMouseDown={(e) => {
                      if (e.evt.ctrlKey || e.evt.metaKey) e.target.stopDrag?.();
                    }}
                    onDragEnd={(e) => {
                      movePiece(p.id, e.target.x() / drawScale, e.target.y() / drawScale, config);
                    }}
                  >
                    {swatch && (
                      <Rect
                        width={boxWm}
                        height={boxHm}
                        fillPatternImage={swatch}
                        fillPatternRepeat="repeat"
                        listening={false}
                      />
                    )}
                    <KImage
                      image={img}
                      x={rotated ? boxWm : flip ? drawW : 0}
                      y={0}
                      width={drawW}
                      height={drawH}
                      rotation={rotated ? 90 : 0}
                      scaleX={flip ? -1 : 1}
                      opacity={usableSrc(design?.src) ? 1 : 0.9}
                      listening={false}
                    />
                    <Rect
                      width={boxWm}
                      height={boxHm}
                      stroke={selected ? "#e22b12" : "rgba(30,26,22,0.22)"}
                      strokeWidth={selected ? 1.5 : 0.6}
                      listening={false}
                    />
                  </Group>
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
