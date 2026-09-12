import type { CSSProperties } from "react";
import { fontOf } from "../fonts/catalog";
import type { TextAlign, TextObject, TextTransform } from "../types";

export type QuickTextPreset = "none" | "neon" | "outline" | "shadow";

export const DEFAULT_LINE_HEIGHT = 1.25;

export type TextShapeProps = {
  text: string;
  x?: number;
  y?: number;
  width?: number;
  rotation?: number;
  offsetX?: number;
  offsetY?: number;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  fontVariant: string;
  fill: string;
  align: TextAlign;
  lineHeight: number;
  letterSpacing: number;
  wrap: "word" | "none";
  opacity: number;
  fillEnabled: boolean;
  stroke?: string;
  strokeWidth: number;
  fillAfterStrokeEnabled: boolean;
  lineJoin: "round" | "miter" | "bevel";
  shadowEnabled: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  perfectDrawEnabled: boolean;
};

export type TextPaint = {
  dx?: number;
  dy?: number;
  fill?: string;
  fillEnabled?: boolean;
  stroke?: string;
  strokeWidth?: number;
  fillAfterStroke?: boolean;
  opacity?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  letterSpacing?: number;
  fontStyle?: string;
  lineJoin?: "round" | "miter" | "bevel";
};

type Glyph = {
  char: string;
  x: number;
  y: number;
  rotation: number;
  width: number;
};

let measureCtx: CanvasRenderingContext2D | null = null;

export function curveOf(obj: TextObject): number {
  return obj.curve ?? 0;
}

export function isCurved(obj: TextObject): boolean {
  return Math.abs(curveOf(obj)) >= 1;
}

export function lineHeightOf(obj: TextObject): number {
  return obj.lineHeight ?? DEFAULT_LINE_HEIGHT;
}

export function letterSpacingOf(obj: TextObject): number {
  return obj.letterSpacing ?? 0;
}

export function strokeWidthOf(obj: TextObject): number {
  return obj.strokeWidth ?? 0;
}

export function textTransformOf(obj: TextObject): TextTransform {
  return obj.textTransform ?? "none";
}

export function displayText(obj: TextObject): string {
  const text = obj.text;
  return textTransformOf(obj) === "uppercase" ? text.toUpperCase() : text;
}

export function fontVariantOf(obj: TextObject): "normal" | "small-caps" {
  return textTransformOf(obj) === "small-caps" ? "small-caps" : "normal";
}

export function hasShadow(obj: TextObject): boolean {
  return (
    (obj.shadowBlur ?? 0) > 0 || (obj.shadowOffsetX ?? 0) !== 0 || (obj.shadowOffsetY ?? 0) !== 0
  );
}

export function textVisualHeight(obj: TextObject): number {
  if (!isCurved(obj)) return obj.fontSize * lineHeightOf(obj);
  return layoutCurvedGlyphs(obj).height;
}

export function hasNamedEffect(obj: TextObject): boolean {
  return obj.effect != null && obj.effect !== "none";
}

export function matchingTextPreset(obj: TextObject): QuickTextPreset | null {
  if (obj.effect === "neon") return "neon";
  if (obj.effect === "outline") return "outline";
  if (obj.effect === "drop") return "shadow";
  if (hasNamedEffect(obj)) return null;
  const stroke = strokeWidthOf(obj);
  const blur = obj.shadowBlur ?? 0;
  const ox = obj.shadowOffsetX ?? 0;
  const oy = obj.shadowOffsetY ?? 0;
  if (stroke === 0 && blur === 0 && ox === 0 && oy === 0) return "none";
  if (blur >= 14 && Math.abs(ox) < 1 && Math.abs(oy) < 1) return "neon";
  if (stroke > 0 && blur === 0 && ox === 0 && oy === 0) return "outline";
  if (stroke === 0 && (blur > 0 || ox !== 0 || oy !== 0)) return "shadow";
  return null;
}

export function textEffectPatch(obj: TextObject, preset: QuickTextPreset): Partial<TextObject> {
  if (preset === "none") {
    return {
      effect: "none",
      strokeWidth: 0,
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowOpacity: 0,
    };
  }
  if (preset === "neon") {
    const glow = neonColorFor(obj.fill);
    return {
      effect: "none",
      shadowColor: glow,
      shadowBlur: Math.max(18, Math.round(obj.fontSize * 0.42)),
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowOpacity: 1,
      stroke: glow,
      strokeWidth: Math.max(1, Math.round(obj.fontSize * 0.055)),
    };
  }
  if (preset === "outline") {
    return {
      effect: "none",
      stroke: outlineColorFor(obj.fill),
      strokeWidth: Math.max(2, Math.round(obj.fontSize * 0.08)),
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowOpacity: 0,
    };
  }
  return {
    effect: "none",
    strokeWidth: 0,
    shadowColor: "#1a1614",
    shadowBlur: Math.max(8, Math.round(obj.fontSize * 0.18)),
    shadowOffsetX: Math.max(2, Math.round(obj.fontSize * 0.08)),
    shadowOffsetY: Math.max(3, Math.round(obj.fontSize * 0.1)),
    shadowOpacity: 0.4,
  };
}

export function textShapes(obj: TextObject, paint?: TextPaint): TextShapeProps[] {
  const shared = sharedPaint(obj, paint);
  const dx = paint?.dx ?? 0;
  const dy = paint?.dy ?? 0;
  const letterSpacing = paint?.letterSpacing ?? letterSpacingOf(obj);
  if (!isCurved(obj)) {
    return [
      {
        ...shared,
        text: displayText(obj),
        x: dx,
        y: dy,
        width: obj.width,
        align: obj.align,
        lineHeight: lineHeightOf(obj),
        letterSpacing,
        wrap: "word",
      },
    ];
  }

  const layout = layoutCurvedGlyphs(obj, letterSpacing, paint?.fontStyle);
  let ax = 0;
  if (obj.align === "center") ax = (obj.width - layout.width) / 2;
  else if (obj.align === "right") ax = obj.width - layout.width;
  const offsetY = baselineOffset(obj.fontSize);

  return layout.glyphs.map((g) => ({
    ...shared,
    text: g.char,
    x: g.x + ax + dx,
    y: g.y + dy,
    width: Math.max(g.width, 1),
    rotation: g.rotation,
    offsetX: g.width / 2,
    offsetY,
    align: "left",
    lineHeight: 1,
    letterSpacing: 0,
    wrap: "none",
  }));
}

export function textContentBox(obj: TextObject): { x: number; y: number; width: number; height: number } {
  if (isCurved(obj)) return curvedHitBox(obj);
  const width = Math.min(obj.width, Math.max(measureUnwrappedWidth(obj), obj.fontSize * 0.45));
  let x = 0;
  if (obj.align === "center") x = (obj.width - width) / 2;
  else if (obj.align === "right") x = obj.width - width;
  return { x, y: 0, width, height: textVisualHeight(obj) };
}

export function curvedHitBox(obj: TextObject): { x: number; y: number; width: number; height: number } {
  const layout = layoutCurvedGlyphs(obj);
  let dx = 0;
  if (obj.align === "center") dx = (obj.width - layout.width) / 2;
  else if (obj.align === "right") dx = obj.width - layout.width;
  return {
    x: dx,
    y: 0,
    width: Math.max(8, layout.width),
    height: Math.max(layout.height, obj.fontSize * lineHeightOf(obj)),
  };
}

export function overlayTextStyle(obj: TextObject, zoom: number): CSSProperties {
  const transform = textTransformOf(obj);
  return {
    fontFamily: fontOf(obj.fontFamily),
    fontSize: `${obj.fontSize * zoom}px`,
    fontWeight: obj.fontWeight,
    color: obj.fill,
    textAlign: obj.align,
    lineHeight: lineHeightOf(obj),
    opacity: obj.opacity,
    letterSpacing: `${letterSpacingOf(obj) * zoom}px`,
    textTransform: transform === "uppercase" ? "uppercase" : "none",
    fontVariant: transform === "small-caps" ? "small-caps" : "normal",
  };
}

export function previewTextStyle(obj: TextObject, pageHeight: number): CSSProperties {
  const transform = textTransformOf(obj);
  const fs = obj.fontSize;
  const strokeW = strokeWidthOf(obj);
  const style: CSSProperties = {
    color: obj.fill,
    fontFamily: fontOf(obj.fontFamily),
    fontSize: `${(fs / pageHeight) * 100}%`,
    fontWeight: obj.fontWeight,
    textAlign: obj.align,
    lineHeight: lineHeightOf(obj),
    whiteSpace: "pre-wrap",
    letterSpacing: `${letterSpacingOf(obj) / fs}em`,
    textTransform: transform === "uppercase" ? "uppercase" : "none",
    fontVariant: transform === "small-caps" ? "small-caps" : "normal",
  };
  if (!hasNamedEffect(obj)) {
    if (strokeW > 0) {
      style.WebkitTextStroke = `${strokeW / fs}em ${obj.stroke ?? obj.fill}`;
      style.paintOrder = "stroke fill";
    }
    const shadow = cssTextShadow(obj);
    if (shadow) style.textShadow = shadow;
  }
  return style;
}

function sharedPaint(
  obj: TextObject,
  paint?: TextPaint,
): Omit<TextShapeProps, "text" | "align" | "lineHeight" | "letterSpacing" | "wrap" | "width"> {
  const inherit = paint == null;
  const strokeWidth = inherit ? strokeWidthOf(obj) : (paint.strokeWidth ?? 0);
  const hasStroke = strokeWidth > 0 && (inherit || Boolean(paint.stroke));
  const shadow = inherit
    ? hasShadow(obj)
    : (paint.shadowBlur ?? 0) > 0 || (paint.shadowOffsetX ?? 0) !== 0 || (paint.shadowOffsetY ?? 0) !== 0;
  const fillEnabled = paint?.fillEnabled ?? true;
  return {
    fontSize: obj.fontSize,
    fontFamily: fontOf(obj.fontFamily),
    fontStyle: paint?.fontStyle ?? String(obj.fontWeight),
    fontVariant: fontVariantOf(obj),
    fill: paint?.fill ?? obj.fill,
    fillEnabled,
    opacity: paint?.opacity ?? 1,
    stroke: hasStroke ? (paint?.stroke ?? obj.stroke ?? obj.fill) : undefined,
    strokeWidth: hasStroke ? strokeWidth : 0,
    fillAfterStrokeEnabled: paint?.fillAfterStroke ?? hasStroke,
    lineJoin: paint?.lineJoin ?? "round",
    shadowEnabled: shadow,
    shadowColor: shadow ? (paint?.shadowColor ?? obj.shadowColor ?? "#000000") : undefined,
    shadowBlur: shadow ? (paint?.shadowBlur ?? obj.shadowBlur ?? 0) : undefined,
    shadowOffsetX: shadow ? (paint?.shadowOffsetX ?? obj.shadowOffsetX ?? 0) : undefined,
    shadowOffsetY: shadow ? (paint?.shadowOffsetY ?? obj.shadowOffsetY ?? 0) : undefined,
    shadowOpacity: shadow ? (paint?.shadowOpacity ?? obj.shadowOpacity ?? 0.85) : undefined,
    perfectDrawEnabled: !(hasStroke || shadow),
  };
}

function layoutCurvedGlyphs(
  obj: TextObject,
  letterSpacing = letterSpacingOf(obj),
  fontStyle?: string,
): { glyphs: Glyph[]; width: number; height: number } {
  const chars = Array.from(displayText(obj).replace(/\n/g, " "));
  const fontSize = obj.fontSize;
  const fallbackH = fontSize * lineHeightOf(obj);
  if (chars.length === 0) {
    return { glyphs: [], width: obj.width, height: fallbackH };
  }

  const widths = measureCharWidths(
    chars,
    fontSize,
    fontOf(obj.fontFamily),
    fontStyle ?? String(obj.fontWeight),
    fontVariantOf(obj),
  );
  let total = 0;
  for (let i = 0; i < chars.length; i++) {
    total += widths[i] ?? 0;
    if (i < chars.length - 1) total += letterSpacing;
  }
  if (total <= 0) {
    return { glyphs: [], width: obj.width, height: fallbackH };
  }

  const curve = curveOf(obj);
  const sign = curve >= 0 ? 1 : -1;
  const arcAngle = (Math.abs(curve) / 100) * Math.PI;
  const radius = total / Math.max(arcAngle, 1e-4);
  const offsetY = baselineOffset(fontSize);
  const raw: Glyph[] = [];
  let dist = 0;
  for (let i = 0; i < chars.length; i++) {
    const w = widths[i] ?? 0;
    const mid = dist + w / 2;
    const theta = -arcAngle / 2 + (mid / total) * arcAngle;
    raw.push({
      char: chars[i] ?? "",
      x: radius * Math.sin(theta),
      y: -sign * radius * Math.cos(theta),
      rotation: (sign * theta * 180) / Math.PI,
      width: w,
    });
    dist += w + letterSpacing;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const g of raw) {
    const corners = [
      { x: -g.width / 2, y: -offsetY },
      { x: g.width / 2, y: -offsetY },
      { x: -g.width / 2, y: fontSize * 0.35 },
      { x: g.width / 2, y: fontSize * 0.35 },
    ];
    for (const c of corners) {
      const p = rotatePoint(c.x, c.y, g.rotation);
      const gx = g.x + p.x;
      const gy = g.y + p.y;
      if (gx < minX) minX = gx;
      if (gy < minY) minY = gy;
      if (gx > maxX) maxX = gx;
      if (gy > maxY) maxY = gy;
    }
  }
  if (!Number.isFinite(minX)) {
    return { glyphs: [], width: obj.width, height: fallbackH };
  }

  return {
    glyphs: raw.map((g) => ({ ...g, x: g.x - minX, y: g.y - minY })),
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function measureCharWidths(
  chars: string[],
  fontSize: number,
  fontFamily: string,
  fontStyle: string,
  fontVariant: string,
): number[] {
  if (!measureCtx) {
    measureCtx = document.createElement("canvas").getContext("2d");
  }
  const ctx = measureCtx;
  if (!ctx) return chars.map(() => fontSize * 0.5);
  ctx.font = `${fontStyle} ${fontVariant} ${fontSize}px ${fontFamily}`;
  return chars.map((ch) => {
    const w = ctx.measureText(ch === " " ? " " : ch).width;
    return w > 0 ? w : fontSize * 0.3;
  });
}

function rotatePoint(x: number, y: number, deg: number): { x: number; y: number } {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: x * c - y * s, y: x * s + y * c };
}

function baselineOffset(fontSize: number): number {
  return fontSize * 0.8;
}

function measureUnwrappedWidth(obj: TextObject): number {
  const chars = Array.from(displayText(obj).replace(/\n/g, " "));
  if (chars.length === 0) return obj.fontSize;
  const widths = measureCharWidths(
    chars,
    obj.fontSize,
    fontOf(obj.fontFamily),
    String(obj.fontWeight),
    fontVariantOf(obj),
  );
  const letterSpacing = letterSpacingOf(obj);
  let total = 0;
  for (let i = 0; i < chars.length; i++) {
    total += widths[i] ?? 0;
    if (i < chars.length - 1) total += letterSpacing;
  }
  return Math.max(total, obj.fontSize * 0.45);
}

function cssTextShadow(obj: TextObject): string | undefined {
  if (!hasShadow(obj)) return undefined;
  const fs = obj.fontSize;
  const blur = obj.shadowBlur ?? 0;
  const ox = obj.shadowOffsetX ?? 0;
  const oy = obj.shadowOffsetY ?? 0;
  const color = obj.shadowColor ?? "#000000";
  const shadow = `${ox / fs}em ${oy / fs}em ${blur / fs}em ${color}`;
  if (Math.abs(ox) < 0.5 && Math.abs(oy) < 0.5 && blur > 0) {
    return `${shadow}, 0 0 ${(blur * 1.7) / fs}em ${color}`;
  }
  return shadow;
}

function parseRgb(fill: string): { r: number; g: number; b: number } | null {
  const h = fill.trim();
  if (!h.startsWith("#") || (h.length !== 7 && h.length !== 4)) return null;
  if (h.length === 4) {
    return {
      r: parseInt(h[1]! + h[1], 16),
      g: parseInt(h[2]! + h[2], 16),
      b: parseInt(h[3]! + h[3], 16),
    };
  }
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  };
}

function luminance(fill: string): number {
  const rgb = parseRgb(fill);
  if (!rgb) return 0.2;
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

function outlineColorFor(fill: string): string {
  return luminance(fill) > 0.55 ? "#1a1614" : "#ffffff";
}

function neonColorFor(fill: string): string {
  const rgb = parseRgb(fill);
  if (rgb && rgb.b > rgb.r + 25 && rgb.g > rgb.r) return "#ff3dce";
  return "#22f0ff";
}
