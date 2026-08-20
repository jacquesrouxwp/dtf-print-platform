"use client";

import Konva from "konva";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Group, Image as KImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import { MIN_PIECE_MM, usableWidthMm } from "@/lib/units";
import { useBuilderStore } from "@/store/useBuilderStore";
import { useSettingsStore } from "@/store/useSettingsStore";

const RULER = 26;
/** Neutral margin around the film, so it sits on a surface instead of in a corner. */
const SURROUND = 24;

function usableSrc(src?: string) {
  return Boolean(src && !src.startsWith("data:,"));
}

/** One continuous PET checker. Equal squares, no strokes, no per-piece reset. */
function makeAlphaSwatch(cell = 10): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = cell * 2;
  c.height = cell * 2;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.fillStyle = "#efe8dc";
  ctx.fillRect(0, 0, cell * 2, cell * 2);
  ctx.fillStyle = "#d4cdc0";
  ctx.fillRect(0, 0, cell, cell);
  ctx.fillRect(cell, cell, cell, cell);
  return c;
}

function RulerMarks({
  lengthMm,
  pxPerMm,
  axis,
}: {
  lengthMm: number;
  pxPerMm: number;
  axis: "h" | "v";
}) {
  const marks: { mm: number; major: boolean }[] = [];
  const end = Math.max(0, lengthMm);
  for (let mm = 0; mm <= end + 0.01; mm += 10) {
    marks.push({ mm, major: mm % 50 === 0 });
  }
  return (
    <>
      {marks.map(({ mm, major }) => {
        const pos = mm * pxPerMm;
        const cm = mm / 10;
        if (axis === "h") {
          return (
            <div
              key={mm}
              className="absolute bottom-0"
              style={{ left: pos, width: 1, height: "100%" }}
            >
              <div
                className={`absolute bottom-0 w-px ${major ? "h-2.5 bg-[#c9c1b3]" : "h-1.5 bg-[#7a7368]"}`}
              />
              {major && (
                <span
                  className="num pointer-events-none absolute left-0 top-0.5 text-[9px] leading-none text-[#a89f91]"
                  style={{ transform: cm === 0 ? "none" : "translateX(-50%)" }}
                >
                  {cm}
                </span>
              )}
            </div>
          );
        }
        return (
          <div
            key={mm}
            className="absolute right-0"
            style={{ top: pos, height: 1, width: "100%" }}
          >
            <div
              className={`absolute right-0 h-px ${major ? "w-2.5 bg-[#c9c1b3]" : "w-1.5 bg-[#7a7368]"}`}
            />
            {major && (
              <span
                className="num pointer-events-none absolute left-0.5 text-[9px] leading-none text-[#a89f91]"
                style={{
                  top: 0,
                  transform: cm === 0 ? "none" : "translateY(-50%)",
                }}
              >
                {cm}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}

export function BuilderCanvas({
  interactive,
  zoomPct,
}: {
  interactive: boolean;
  zoomPct: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const pieceRefs = useRef<Record<string, Konva.Group | null>>({});
  const [boxW, setBoxW] = useState(0);
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});
  const [swatch, setSwatch] = useState<HTMLCanvasElement | null>(null);
  const config = useSettingsStore((s) => s.config);
  const designs = useBuilderStore((s) => s.designs);
  const placed = useBuilderStore((s) => s.placed);
  const lengthMm = useBuilderStore((s) => s.lengthMm);
  const selectedId = useBuilderStore((s) => s.selectedId);
  const select = useBuilderStore((s) => s.select);
  const movePiece = useBuilderStore((s) => s.movePiece);
  const resizePiece = useBuilderStore((s) => s.resizePiece);
  const removePiece = useBuilderStore((s) => s.removePiece);

  useEffect(() => {
    // Measure the scrolling box, not its parent: a vertical scrollbar eats
    // real width, and centring against the wrong number leaves the film
    // sitting off to one side.
    const el = scrollRef.current ?? wrapRef.current;
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
    setSwatch(makeAlphaSwatch(10));
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
  // Room for the film once the ruler and a margin of surround are taken out.
  const avail = Math.max(0, boxW - RULER - SURROUND * 2);
  // 100% means the whole width of the roll fits. Zooming past that has to make
  // the film genuinely bigger and scroll, not stop at the edge of the box.
  const fitScale = avail > 0 ? avail / roll : 0;
  const drawScale = fitScale * (Math.max(25, Math.min(zoomPct, 400)) / 100);
  const stageW = Math.max(1, Math.round(roll * drawScale));
  const stageH = Math.max(200, Math.min(Math.round(viewLength * drawScale), 20000));
  const canDrag = interactive;
  const selectedPieceId = placed.some((p) => p.id === selectedId) ? selectedId : null;
  const usable = usableWidthMm(config.rollWidthMm, config.edgeMm);
  const minPx = MIN_PIECE_MM * drawScale;
  // Whole metres that fall inside the visible film.
  const metreMarks: number[] = [];
  for (let mm = 1000; mm <= viewLength; mm += 1000) metreMarks.push(mm);

  useLayoutEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = selectedPieceId && canDrag ? pieceRefs.current[selectedPieceId] : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedPieceId, placed, canDrag, drawScale]);

  return (
    <div ref={wrapRef} className="builder-film relative h-full min-h-[420px] min-w-0 w-full max-w-full overflow-hidden">
      <div ref={scrollRef} className="h-full w-full max-w-full overflow-auto rounded-xl bg-[#161412]">
        {avail > 0 && (
          <div
            className="relative"
            style={{
              width: RULER + stageW,
              height: RULER + stageH,
              // Centred while it fits, and still scrollable from the left edge
              // once the customer zooms past the width of the box.
              margin: `${SURROUND}px auto`,
            }}
          >
            <div
              className="num pointer-events-none absolute left-0 top-0 z-10 grid place-items-center text-[9px] text-[#8a8378]"
              style={{ width: RULER, height: RULER }}
            >
              cm
            </div>
            <div
              className="pointer-events-none absolute top-0 z-10 overflow-hidden border-b border-[#3a3530]"
              style={{ left: RULER, width: stageW, height: RULER }}
            >
              <RulerMarks lengthMm={roll} pxPerMm={drawScale} axis="h" />
            </div>
            <div
              className="pointer-events-none absolute left-0 z-10 overflow-hidden border-r border-[#3a3530]"
              style={{ top: RULER, width: RULER, height: stageH }}
            >
              <RulerMarks lengthMm={viewLength} pxPerMm={drawScale} axis="v" />
            </div>
            <div className="absolute" style={{ left: RULER, top: RULER }}>
              <Stage width={stageW} height={stageH}>
                <Layer>
                  {swatch ? (
                    <Rect
                      x={0}
                      y={0}
                      width={stageW}
                      height={stageH}
                      fillPatternImage={swatch as unknown as HTMLImageElement}
                      fillPatternRepeat="repeat"
                      perfectDrawEnabled={false}
                      onMouseDown={() => select(null)}
                    />
                  ) : (
                    <Rect
                      x={0}
                      y={0}
                      width={stageW}
                      height={stageH}
                      fill="#efe8dc"
                      onMouseDown={() => select(null)}
                    />
                  )}
                  {placed.map((p) => {
                    const design = designs.find((d) => d.id === p.designId);
                    const img = images[p.designId];
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
                        ref={(node) => {
                          pieceRefs.current[p.id] = node;
                        }}
                        x={ox}
                        y={oy}
                        width={boxWm}
                        height={boxHm}
                        clipX={0}
                        clipY={0}
                        clipWidth={boxWm}
                        clipHeight={boxHm}
                        draggable={canDrag}
                        onMouseEnter={(e) => {
                          const el = e.target.getStage()?.container();
                          if (el) el.style.cursor = "move";
                        }}
                        onMouseLeave={(e) => {
                          const el = e.target.getStage()?.container();
                          if (el) el.style.cursor = "default";
                        }}
                        onClick={(e) => {
                          e.cancelBubble = true;
                          const ev = e.evt;
                          if (ev.ctrlKey || ev.metaKey) {
                            removePiece(p.id, config);
                            return;
                          }
                          select(p.id);
                        }}
                        onTap={() => select(p.id)}
                        onMouseDown={(e) => {
                          e.cancelBubble = true;
                          if (e.evt.ctrlKey || e.evt.metaKey) {
                            e.target.stopDrag?.();
                            return;
                          }
                          select(p.id);
                        }}
                        onDragEnd={(e) => {
                          movePiece(p.id, e.target.x() / drawScale, e.target.y() / drawScale, config);
                        }}
                        onTransformEnd={(e) => {
                          const node = e.target as Konva.Group;
                          const sx = node.scaleX();
                          const sy = node.scaleY();
                          node.scaleX(1);
                          node.scaleY(1);
                          resizePiece(
                            p.id,
                            (node.width() * sx) / drawScale,
                            (node.height() * sy) / drawScale,
                            config,
                            { xMm: node.x() / drawScale, yMm: node.y() / drawScale }
                          );
                        }}
                      >
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
                          fill="rgba(0,0,0,0.001)"
                        />
                      </Group>
                    );
                  })}
                  {/* Every whole metre of film, marked. A customer buying by the
                      metre should be able to see where one ends and the next
                      begins instead of trusting a number in a panel. */}
                  {metreMarks.map((mm) => (
                    <Group key={`m${mm}`} listening={false}>
                      <Line
                        points={[0, mm * drawScale, stageW, mm * drawScale]}
                        stroke="#e0623a"
                        strokeWidth={1}
                        dash={[2, 5]}
                        opacity={0.85}
                      />
                      <Text
                        x={stageW - 46}
                        y={mm * drawScale - 15}
                        text={`${mm / 1000} m`}
                        fill="#e0623a"
                        fontFamily="ui-monospace, monospace"
                        fontSize={11}
                      />
                    </Group>
                  ))}
                  <Line
                    points={[0, lengthMm * drawScale, stageW, lengthMm * drawScale]}
                    stroke="#7eb6e4"
                    dash={[8, 6]}
                    listening={false}
                  />
                  <Text
                    x={8}
                    y={Math.max(8, lengthMm * drawScale - 18)}
                    text={`${(lengthMm / 10).toFixed(1)} cm`}
                    fill="#7eb6e4"
                    fontFamily="ui-monospace, monospace"
                    fontSize={12}
                    listening={false}
                  />
                  {canDrag && (
                    <Transformer
                      ref={trRef}
                      rotateEnabled={false}
                      flipEnabled={false}
                      keepRatio
                      enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
                      borderStroke="#7eb6e4"
                      borderStrokeWidth={1}
                      anchorStroke="#7eb6e4"
                      anchorFill="#efe8db"
                      anchorSize={9}
                      anchorCornerRadius={1}
                      boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < minPx || newBox.height < minPx) return oldBox;
                        const maxW = Math.max(minPx, usable * drawScale);
                        if (newBox.width > maxW) {
                          const ratio = newBox.height / Math.max(1, newBox.width);
                          return { ...newBox, width: maxW, height: maxW * ratio };
                        }
                        return newBox;
                      }}
                    />
                  )}
                </Layer>
              </Stage>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
