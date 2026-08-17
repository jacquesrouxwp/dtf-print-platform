"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import type p5 from "p5";
import P5 from "p5";

declare global {
  interface Window {
    p5: unknown;
  }
}

const colors = ["#3A86FF", "#FF006E", "#8338EC", "#FB5607", "#00AFB9", "#3DB9CC"];
const PAPER = "#f3efe6";

function easeOutQuint(x: number): number {
  return 1 - Math.pow(1 - x, 5);
}

class Bubble {
  x: number;
  y: number;
  d: number;
  cage: Wisp[];
  dst: number;
  clr: string;
  hue: number;

  constructor(p: p5, x: number, y: number, d: number) {
    this.x = x;
    this.y = y;
    this.d = d;
    this.cage = [];
    this.dst = this.d / 2;
    this.clr = p.random(colors) as string;
    this.hue = p.random(360);
  }

  show(p: p5): void {
    p.push();
    p.translate(this.x, this.y);
    p.colorMode(p.HSB, 360, 100, 100, 100);
    p.noStroke();
    const c = p.color(this.hue, 70, 90, 90);
    p.fill(c);
    p.circle(0, 0, this.d);

    for (const w of this.cage) {
      w.run(p);
    }

    for (const w of this.cage) {
      aetherLink(p, w.x, w.y, w.d, 0, 0, this.d, this.dst);
    }

    for (let i = this.cage.length - 1; i >= 0; i--) {
      if (this.cage[i].isDead) {
        this.cage.splice(i, 1);
      }
    }

    if (p.random() < 0.02) {
      this.addWisp(p);
    }
    p.pop();
  }

  addWisp(p: p5): void {
    this.cage.push(
      new Wisp(
        p,
        0,
        0,
        this.d * p.random(0.25, 0.75),
        this.d * p.random(0.75, 1.25),
        this.hue
      )
    );
  }

  run(p: p5): void {
    this.show(p);
  }
}

class Wisp {
  x: number;
  y: number;
  d: number;
  timer: number;
  endTime: number;
  ang: number;
  r: number;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  originD: number;
  isDead: boolean;
  hue: number;

  constructor(p: p5, x: number, y: number, d: number, r: number, hue: number) {
    this.x = x;
    this.y = y;
    this.d = d;
    this.timer = 0;
    this.endTime = Math.floor(p.random(60, 200));
    this.ang = p.random(p.TAU);
    this.r = r;
    this.originX = this.x;
    this.originY = this.y;
    this.targetX = this.x + this.r * p.cos(this.ang);
    this.targetY = this.y + this.r * p.sin(this.ang);
    this.originD = d;
    this.isDead = false;
    this.hue = hue;
  }

  show(p: p5): void {
    if (this.isDead === false) {
      p.colorMode(p.HSB, 360, 100, 100, 100);
      const c = p.color(this.hue, 40, 95, 70);
      p.noStroke();
      p.fill(c);
      p.circle(this.x, this.y, this.d);
    }
  }

  move(p: p5): void {
    this.timer++;
    if (0 < this.timer && this.timer < this.endTime) {
      const n = p.norm(this.timer, 0, this.endTime);
      this.x = p.lerp(this.originX, this.targetX, easeOutQuint(n));
      this.y = p.lerp(this.originY, this.targetY, easeOutQuint(n));
      this.d = p.lerp(this.originD, 0, n);
    }
    if (this.timer > this.endTime) {
      this.isDead = true;
    }
  }

  run(p: p5): void {
    this.show(p);
    this.move(p);
  }
}

function aetherLink(
  p: p5,
  x1: number,
  y1: number,
  d1: number,
  x2: number,
  y2: number,
  d2: number,
  dst: number
): void {
  const r = dst / 2;
  const r1 = d1 / 2;
  const r2 = d2 / 2;
  const R1 = r1 + r;
  const R2 = r2 + r;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = p.sqrt(dx * dx + dy * dy);

  if (d > R1 + R2) {
    return;
  }

  const dirX = dx / d;
  const dirY = dy / d;
  const a = (R1 * R1 - R2 * R2 + d * d) / (2 * d);
  const underRoot = R1 * R1 - a * a;
  if (underRoot < 0) return;
  const h = p.sqrt(underRoot);
  const midX = x1 + dirX * a;
  const midY = y1 + dirY * a;
  const perpX = -dirY * h;
  const perpY = dirX * h;
  const cx1 = midX + perpX;
  const cy1 = midY + perpY;
  const cx2 = midX - perpX;
  const cy2 = midY - perpY;

  if (p.dist(cx1, cy1, cx2, cy2) < r * 2) {
    return;
  }

  const ang1 = p.atan2(y1 - cy1, x1 - cx1);
  let ang2 = p.atan2(y2 - cy1, x2 - cx1);
  const ang3 = p.atan2(y2 - cy2, x2 - cx2);
  let ang4 = p.atan2(y1 - cy2, x1 - cx2);

  if (ang2 < ang1) {
    ang2 += p.TAU;
  }
  p.colorMode(p.RGB, 255, 255, 255, 100);
  p.noFill();
  p.stroke(180, 200, 240, 40);
  p.strokeWeight(0.8);
  p.beginShape();
  for (let i = ang1; i < ang2; i += p.TAU / 180) {
    p.vertex(cx1 + r * p.cos(i), cy1 + r * p.sin(i));
  }
  if (ang4 < ang3) {
    ang4 += p.TAU;
  }
  for (let i = ang3; i < ang4; i += p.TAU / 180) {
    p.vertex(cx2 + r * p.cos(i), cy2 + r * p.sin(i));
  }
  p.endShape();
}

function seedBubbles(p: p5): Bubble[] {
  const bubbles: Bubble[] = [];
  const area = Math.min(p.width, p.height) * 0.92;
  const cellCount = Math.max(5, Math.min(8, Math.round(Math.min(p.width, p.height) / 140)));
  const cellSize = area / cellCount;
  const ox = (p.width - cellCount * cellSize) / 2;
  const oy = (p.height - cellCount * cellSize) / 2;
  for (let i = 0; i < cellCount; i++) {
    for (let j = 0; j < cellCount; j++) {
      const x = ox + cellSize * i + cellSize / 2;
      const y = oy + cellSize * j + cellSize / 2 + cellSize * 0.08;
      bubbles.push(new Bubble(p, x, y, cellSize * 0.4));
    }
  }
  return bubbles;
}

interface BubbleSketchProps {
  className?: string;
  width?: number;
  height?: number;
  fillViewport?: boolean;
}

export function BubbleSketch({
  className = "",
  width = 900,
  height = 900,
  fillViewport = false,
}: BubbleSketchProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<p5 | undefined>(undefined);
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vp, setVp] = useState({ w: width, h: height });

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!fillViewport) {
      setVp({ w: width, h: height });
      return;
    }
    let timer: number | undefined;
    const measure = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(
        () => setVp({ w: window.innerWidth, h: window.innerHeight }),
        180
      );
    };
    setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", measure);
    };
  }, [fillViewport, width, height]);

  useEffect(() => {
    if (!isMounted || !containerRef.current || vp.w < 2 || vp.h < 2) return;

    const loadP5AndCreateSketch = async () => {
      try {
        if (sketchRef.current) {
          sketchRef.current.remove();
        }

        sketchRef.current = new P5((p: p5) => {
          let bubbles: Bubble[] = [];

          p.setup = () => {
            p.createCanvas(vp.w, vp.h).parent(containerRef.current!);
            p.rectMode(p.CENTER);
            p.colorMode(p.HSB, 360, 100, 100, 100);
            p.pixelDensity(1);
            bubbles = seedBubbles(p);
          };

          p.draw = () => {
            p.background(PAPER);
            for (const b of bubbles) {
              b.run(p);
            }
          };
        });
      } catch (err) {
        setError(`Failed to load: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    loadP5AndCreateSketch();

    return () => {
      if (sketchRef.current) {
        sketchRef.current.remove();
        sketchRef.current = undefined;
      }
    };
  }, [isMounted, vp.w, vp.h]);

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{ width: vp.w, height: vp.h }}
      >
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black text-red-500">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
