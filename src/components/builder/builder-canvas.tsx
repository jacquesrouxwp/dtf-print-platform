"use client";

import Konva from "konva";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Group, Image as KImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import { filmChrome, filmScale } from "@/lib/film-scale";
import { BLOCK_CUT_GAP_MM, blockCuts } from "@/lib/nesting";
import { MIN_PIECE_MM, usableWidthMm } from "@/lib/units";
import { useBuilderStore } from "@/store/useBuilderStore";
import { useSettingsStore } from "@/store/useSettingsStore";


/** Canvas area a phone browser will still allocate, with room to spare. */
const MAX_CANVAS_PX = 12_000_000;

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
  // At a centimetre a mark, twenty metres of film is two thousand elements the
  // browser has to lay out — and at that zoom they would be a millimetre apart
  // anyway. The step follows the scale: readable marks, never a wall of them.
  const step = [10, 50, 100, 250, 500, 1000].find((mm) => mm * pxPerMm >= 5) ?? 1000;
  const majorEvery = [50, 100, 250, 500, 1000, 5000].find((mm) => mm * pxPerMm >= 28) ?? 5000;
  const marks: { mm: number; major: boolean }[] = [];
  const end = Math.max(0, lengthMm);
  for (let mm = 0; mm <= end + 0.01; mm += step) {
    marks.push({ mm, major: mm % majorEvery === 0 });
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
  chainScroll = false,
}: {
  interactive: boolean;
  zoomPct: number;
  /**
   * Hand the scroll on to the page once the film reaches its end. Right when
   * the film is a card inside a scrolling page; wrong in a full-screen viewer,
   * where there is no page behind it to move.
   */
  chainScroll?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const pieceRefs = useRef<Record<string, Konva.Group | null>>({});
  const panRef = useRef<{ x: number; y: number; top: number; left: number; moved: boolean } | null>(
    null
  );
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
  const layoutMode = useBuilderStore((s) => s.layoutMode);

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

  const { rulerPx: ruler, surroundPx: surround } = filmChrome(boxW);
  const roll = Math.max(1, config.rollWidthMm);
  const viewLength = Math.max(lengthMm + 40, 280);
  // The camera reads the box, the roll and the zoom — never the contents. That
  // is what keeps the film still while a piece is resized.
  const wanted = filmScale({
    boxWidthPx: boxW,
    rollWidthMm: roll,
    zoomPct,
    rulerPx: ruler,
    surroundPx: surround,
  });
  // A browser will not hand out an unbounded canvas, and Safari gives up on
  // area long before height. Twenty metres used to be drawn to the cap and
  // then silently cut off — the customer scrolled to the end of their order
  // and found nothing there. Zoom the whole film out to fit the budget
  // instead: smaller, but all of it is on screen and all of it scrolls.
  const budget = Math.sqrt(MAX_CANVAS_PX / Math.max(1, roll * viewLength));
  const drawScale = Math.min(wanted, budget);
  const stageW = Math.max(1, Math.round(roll * drawScale));
  const stageH = Math.max(200, Math.round(viewLength * drawScale));
  const canDrag = interactive;
  const selectedPieceId = placed.some((p) => p.id === selectedId) ? selectedId : null;
  const usable = usableWidthMm(config.rollWidthMm, config.edgeMm);
  const minPx = MIN_PIECE_MM * drawScale;
  // Whole metres that fall inside the visible film.
  const metreMarks: number[] = [];
  for (let mm = 1000; mm <= viewLength; mm += 1000) metreMarks.push(mm);

  /**
   * Press on empty film and drag: the film scrolls under the mouse, the way a
   * map or a design tool does. A press that does not move is still a click on
   * nothing, and clears the selection.
   */
  function startPan(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.evt.button !== 0) return;
    const box = scrollRef.current;
    if (!box) return;
    panRef.current = {
      x: e.evt.clientX,
      y: e.evt.clientY,
      top: box.scrollTop,
      left: box.scrollLeft,
      moved: false,
    };
    const stageEl = e.target.getStage()?.container();
    const move = (ev: MouseEvent) => {
      const pan = panRef.current;
      if (!pan) return;
      const dx = ev.clientX - pan.x;
      const dy = ev.clientY - pan.y;
      if (!pan.moved && Math.hypot(dx, dy) < 4) return;
      pan.moved = true;
      if (stageEl) stageEl.style.cursor = "grabbing";
      box.scrollTop = pan.top - dy;
      box.scrollLeft = pan.left - dx;
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      if (stageEl) stageEl.style.cursor = "";
      if (panRef.current && !panRef.current.moved) select(null);
      panRef.current = null;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  useLayoutEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = selectedPieceId && canDrag ? pieceRefs.current[selectedPieceId] : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedPieceId, placed, canDrag, drawScale]);

  return (
    <div
      ref={wrapRef}
      className={`builder-film relative h-full min-h-0 w-full min-w-0 max-w-full overflow-hidden md:min-h-[420px] ${
        interactive ? "" : "builder-film--scroll"
      }`}
    >
      <div
        ref={scrollRef}
        // The film scrolls inside its own box: a finger that reaches the end of
        // it must not carry the page along with it.
        className={`thin-scroll h-full w-full max-w-full overflow-auto rounded-xl bg-[#161412] ${
          chainScroll ? "" : "overscroll-contain"
        }`}
      >
        {drawScale > 0 && (
          <div
            className="relative"
            style={{
              width: ruler + stageW,
              height: ruler + stageH,
              // Centred while it fits, and still scrollable from the left edge
              // once the customer zooms past the width of the box.
              margin: `${surround}px auto`,
            }}
          >
            <div
              className="num pointer-events-none absolute left-0 top-0 z-10 grid place-items-center text-[9px] text-[#8a8378]"
              style={{ width: ruler, height: ruler }}
            >
              cm
            </div>
            <div
              className="pointer-events-none absolute top-0 z-10 overflow-hidden border-b border-[#3a3530]"
              style={{ left: ruler, width: stageW, height: ruler }}
            >
              <RulerMarks lengthMm={roll} pxPerMm={drawScale} axis="h" />
            </div>
            <div
              className="pointer-events-none absolute left-0 z-10 overflow-hidden border-r border-[#3a3530]"
              style={{ top: ruler, width: ruler, height: stageH }}
            >
              <RulerMarks lengthMm={viewLength} pxPerMm={drawScale} axis="v" />
            </div>
            <div className="absolute" style={{ left: ruler, top: ruler }}>
              {/* Konva cancels a touchstart whenever the shape under the
                  finger has preventDefault() — and every shape does, by
                  default. The stage's own flag is never consulted for that, so
                  it is switched off on the shapes a finger should scroll
                  across: the film itself always, and the pieces wherever they
                  cannot be dragged anyway. */}
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
                      preventDefault={false}
                      onMouseDown={startPan}
                      onTap={() => select(null)}
                    />
                  ) : (
                    <Rect
                      x={0}
                      y={0}
                      width={stageW}
                      height={stageH}
                      fill="#efe8dc"
                      preventDefault={false}
                      onMouseDown={startPan}
                      onTap={() => select(null)}
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
                        preventDefault={canDrag}
                        onMouseEnter={(e) => {
                          const el = e.target.getStage()?.container();
                          if (el) el.style.cursor = "move";
                        }}
                        onMouseLeave={(e) => {
                          const el = e.target.getStage()?.container();
                          // Back to the film's own cursor, set in CSS.
                          if (el) el.style.cursor = "";
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
                          preventDefault={canDrag}
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
                  {layoutMode === "blocks" &&
                    blockCuts(placed, designs.map((d) => d.id))
                      .slice(0, -1)
                      .map((cut) => (
                        <Group key={`cut${cut.designId}`} listening={false}>
                          <Line
                            points={[
                              0,
                              (cut.endMm + BLOCK_CUT_GAP_MM / 2) * drawScale,
                              stageW,
                              (cut.endMm + BLOCK_CUT_GAP_MM / 2) * drawScale,
                            ]}
                            stroke="#efe8db"
                            strokeWidth={1}
                            dash={[10, 8]}
                            opacity={0.9}
                          />
                          <Text
                            x={6}
                            y={(cut.endMm + BLOCK_CUT_GAP_MM / 2) * drawScale - 14}
                            text="cut"
                            fill="#efe8db"
                            fontFamily="ui-monospace, monospace"
                            fontSize={10}
                            opacity={0.9}
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
