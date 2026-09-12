import type { Fill, ImageCrop, ImageFilter, LinearFill } from "../types";

export const INK = "#1a1614";
export const PAPER = "#f6f1e8";
export const OXBLOOD = "#7a2e2e";
export const GOLD = "#c4a574";

export const DEFAULT_BRAND = [OXBLOOD, INK, GOLD, PAPER];

export function isLinearFill(fill: Fill): fill is LinearFill {
  return typeof fill !== "string" && fill != null && fill.kind === "linear";
}

export function solidColor(fill: Fill | undefined, fallback = INK): string {
  if (fill == null) return fallback;
  if (typeof fill === "string") return fill || fallback;
  return fill.stops[0]?.color || fill.stops[fill.stops.length - 1]?.color || fallback;
}

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function cssFill(fill: Fill): string {
  if (!isLinearFill(fill)) return typeof fill === "string" ? fill : PAPER;
  const stops = [...fill.stops]
    .sort((a, b) => a.offset - b.offset)
    .map((s) => `${s.color} ${Math.round(clamp01(s.offset) * 100)}%`)
    .join(", ");
  return `linear-gradient(${fill.angle}deg, ${stops})`;
}

function linearPoints(angle: number, width: number, height: number): {
  start: { x: number; y: number };
  end: { x: number; y: number };
} {
  const rad = ((angle - 90) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const cx = width / 2;
  const cy = height / 2;
  const len = Math.hypot(width, height) / 2;
  return {
    start: { x: cx - dx * len, y: cy - dy * len },
    end: { x: cx + dx * len, y: cy + dy * len },
  };
}

export type KonvaFillProps = {
  fill?: string;
  fillLinearGradientStartPoint?: { x: number; y: number };
  fillLinearGradientEndPoint?: { x: number; y: number };
  fillLinearGradientColorStops?: (number | string)[];
};

export function konvaFill(fill: Fill, width: number, height: number): KonvaFillProps {
  if (!isLinearFill(fill)) return { fill: typeof fill === "string" ? fill : PAPER };
  const { start, end } = linearPoints(fill.angle, width, height);
  const stops = [...fill.stops].sort((a, b) => a.offset - b.offset);
  return {
    fillLinearGradientStartPoint: start,
    fillLinearGradientEndPoint: end,
    fillLinearGradientColorStops: stops.flatMap((s) => [clamp01(s.offset), s.color]),
  };
}

export function defaultLinearFrom(color: string): LinearFill {
  const other = color.toLowerCase() === PAPER ? OXBLOOD : PAPER;
  return {
    kind: "linear",
    angle: 180,
    stops: [
      { offset: 0, color },
      { offset: 1, color: other },
    ],
  };
}

export function imageHasFilters(filter: ImageFilter | undefined): boolean {
  if (!filter) return false;
  return (
    (filter.brighten != null && filter.brighten !== 0) ||
    (filter.contrast != null && filter.contrast !== 0) ||
    Boolean(filter.grayscale) ||
    (filter.blur != null && filter.blur > 0)
  );
}

export function cssImageFilter(filter: ImageFilter | undefined): string | undefined {
  if (!imageHasFilters(filter) || !filter) return undefined;
  const parts: string[] = [];
  if (filter.brighten) parts.push(`brightness(${1 + filter.brighten})`);
  if (filter.contrast) parts.push(`contrast(${1 + filter.contrast / 100})`);
  if (filter.grayscale) parts.push("grayscale(1)");
  if (filter.blur) parts.push(`blur(${filter.blur}px)`);
  return parts.join(" ");
}

export function normalizedCrop(crop: ImageCrop | undefined): ImageCrop {
  if (!crop) return { x: 0, y: 0, w: 1, h: 1 };
  const w = Math.max(0.05, Math.min(1, crop.w));
  const h = Math.max(0.05, Math.min(1, crop.h));
  const x = clamp01(crop.x);
  const y = clamp01(crop.y);
  return {
    x: Math.min(x, 1 - w),
    y: Math.min(y, 1 - h),
    w,
    h,
  };
}

export function isIdentityCrop(crop: ImageCrop | undefined): boolean {
  if (!crop) return true;
  return crop.x === 0 && crop.y === 0 && crop.w === 1 && crop.h === 1;
}

export function cropObjectPosition(crop: ImageCrop | undefined): string | undefined {
  const c = normalizedCrop(crop);
  if (isIdentityCrop(c)) return undefined;
  const px = c.w >= 1 ? 50 : (c.x / (1 - c.w)) * 100;
  const py = c.h >= 1 ? 50 : (c.y / (1 - c.h)) * 100;
  return `${px}% ${py}%`;
}
