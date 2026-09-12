import type { CSSProperties } from "react";
import Konva from "konva";
import {
  curvedHitBox,
  isCurved,
  textContentBox,
  textShapes,
  textVisualHeight,
  type TextPaint,
  type TextShapeProps,
} from "../text/effects";
import type { TextEffectId, TextObject } from "../types";

export const TEXT_EFFECT_IDS = [
  "none",
  "drop",
  "glow",
  "echo",
  "outline",
  "background",
  "splice",
  "hollow",
  "neon",
  "glitch",
  "neonLights",
  "tvStatic",
  "seventies",
  "scifi",
  "screenprint",
  "western",
  "graffiti",
  "bubble",
  "aerobics",
  "arcade",
  "cosmic",
  "pixel",
] as const satisfies readonly TextEffectId[];

export const EFFECT_TILES: { id: TextEffectId; label: string }[] = [
  { id: "none", label: "None" },
  { id: "drop", label: "Drop" },
  { id: "glow", label: "Glow" },
  { id: "echo", label: "Echo" },
  { id: "outline", label: "Outline" },
  { id: "background", label: "Background" },
  { id: "splice", label: "Splice" },
  { id: "hollow", label: "Hollow" },
  { id: "neon", label: "Neon" },
  { id: "glitch", label: "Glitch" },
  { id: "neonLights", label: "Neon Lights" },
  { id: "tvStatic", label: "TV Static" },
  { id: "seventies", label: "70s" },
  { id: "scifi", label: "Sci-fi" },
  { id: "screenprint", label: "Screenprint" },
  { id: "western", label: "Western" },
  { id: "graffiti", label: "Graffiti" },
  { id: "bubble", label: "Bubble" },
  { id: "aerobics", label: "Aerobics" },
  { id: "arcade", label: "Arcade" },
  { id: "cosmic", label: "Cosmic" },
  { id: "pixel", label: "Pixel" },
];

export const CLEAR_EFFECT_PATCH: Partial<TextObject> = {
  effect: "none",
  strokeWidth: 0,
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowOpacity: 0,
};

const EFFECT_SET = new Set<string>(TEXT_EFFECT_IDS);
const CYAN = "#22d3ee";
const MAGENTA = "#f472b6";
const WHITE = "#ffffff";

type RGB = { r: number; g: number; b: number };

type BgStyle = {
  fill: string;
  opacity: number;
  padX: number;
  padY: number;
  radius: number;
};

type VisualRecipe = {
  bg?: BgStyle;
  layers: Array<TextPaint | undefined>;
};

type EffectRecipe = VisualRecipe & { pixelSize?: number };

type RectProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  opacity?: number;
  cornerRadius?: number;
  listening?: boolean;
  perfectDrawEnabled?: boolean;
};

export type TextDrawNode =
  | { type: "text"; listening: boolean; props: TextShapeProps }
  | { type: "rect"; props: RectProps }
  | { type: "image"; props: { image: HTMLCanvasElement; x: number; y: number; width: number; height: number; listening: boolean } };

export function textEffectOf(obj: TextObject): TextEffectId {
  const effect = obj.effect;
  if (effect && EFFECT_SET.has(effect)) return effect;
  return "none";
}

export function textDrawNodes(obj: TextObject, listening = true): TextDrawNode[] {
  const recipe = recipeFor(obj);
  if (recipe.pixelSize) return pixelNodes(obj, recipe, listening);
  return visualDrawNodes(obj, recipe, listening);
}

export function appendTextDraw(group: Konva.Group, obj: TextObject): void {
  for (const node of textDrawNodes(obj, false)) {
    if (node.type === "text") {
      group.add(new Konva.Text({ ...node.props, listening: false }));
    } else if (node.type === "rect") {
      group.add(new Konva.Rect({ ...node.props, listening: false }));
    } else {
      group.add(new Konva.Image({ ...node.props, listening: false }));
    }
  }
}

export function miniTextDecor(obj: TextObject): CSSProperties {
  const effect = textEffectOf(obj);
  const fill = obj.fill;
  switch (effect) {
    case "drop":
      return { textShadow: `0.06em 0.1em 0.14em color-mix(in srgb, ${fill} 42%, transparent)` };
    case "glow":
    case "neon":
    case "neonLights":
    case "cosmic":
    case "aerobics":
      return { textShadow: `0 0 0.22em ${fill}, 0 0 0.45em ${fill}` };
    case "echo":
      return {
        textShadow: `0.08em 0.08em 0 color-mix(in srgb, ${fill} 45%, white), 0.16em 0.16em 0 color-mix(in srgb, ${fill} 25%, white)`,
      };
    case "outline":
    case "splice":
    case "western":
    case "graffiti":
    case "bubble":
    case "seventies":
      return { WebkitTextStroke: `0.045em color-mix(in srgb, ${fill} 70%, #1a1614)` };
    case "hollow":
      return { color: "transparent", WebkitTextStroke: `0.06em ${fill}` };
    case "glitch":
    case "tvStatic":
    case "pixel":
      return { textShadow: `-0.08em 0 ${CYAN}, 0.08em 0 ${MAGENTA}` };
    case "screenprint":
      return { textShadow: `0.1em 0.08em 0 color-mix(in srgb, ${fill} 55%, #c45c26)` };
    case "scifi":
      return { letterSpacing: "0.12em", textShadow: `0 0 0.2em ${fill}` };
    case "arcade":
      return { WebkitTextStroke: `0.04em color-mix(in srgb, ${fill} 50%, #1a1614)` };
    case "background":
      return { backgroundColor: `color-mix(in srgb, ${fill} 22%, transparent)`, borderRadius: "0.35em" };
    default:
      return {};
  }
}

function recipeFor(obj: TextObject): EffectRecipe {
  const fs = obj.fontSize;
  const fill = obj.fill;
  const rgb = parseColor(fill);
  const italic = `italic ${obj.fontWeight}`;
  const track = fs * 0.14;

  switch (textEffectOf(obj)) {
    case "drop":
      return {
        layers: [
          {
            fill,
            shadowColor: rgba(darken(rgb, 0.35), 1),
            shadowBlur: fs * 0.16,
            shadowOffsetX: fs * 0.12,
            shadowOffsetY: fs * 0.14,
            shadowOpacity: 0.42,
          },
        ],
      };
    case "glow":
      return {
        layers: [
          {
            fill,
            shadowColor: halo(rgb),
            shadowBlur: fs * 0.55,
            shadowOpacity: 0.95,
          },
        ],
      };
    case "echo":
      return {
        layers: [
          { dx: fs * 0.18, dy: fs * 0.16, fill: rgba(lighten(rgb, 0.62), 0.95) },
          { dx: fs * 0.09, dy: fs * 0.08, fill: rgba(lighten(rgb, 0.32), 0.95) },
          { fill },
        ],
      };
    case "outline":
      return {
        layers: [
          {
            fill,
            stroke: rgba(lighten(rgb, 0.28), 1),
            strokeWidth: Math.max(1.6, fs * 0.07),
            fillAfterStroke: true,
            lineJoin: "round",
          },
        ],
      };
    case "background":
      return {
        bg: { fill, opacity: 0.22, padX: fs * 0.42, padY: fs * 0.28, radius: fs * 0.38 },
        layers: [{ fill }],
      };
    case "splice":
      return {
        layers: [
          {
            dx: fs * 0.11,
            dy: fs * 0.09,
            fill: rgba(lighten(rgb, 0.48), 1),
            stroke: rgba(lighten(rgb, 0.48), 1),
            strokeWidth: Math.max(2, fs * 0.11),
            lineJoin: "round",
          },
          {
            fill,
            stroke: fill,
            strokeWidth: Math.max(2, fs * 0.1),
            fillAfterStroke: true,
            lineJoin: "round",
          },
        ],
      };
    case "hollow":
      return {
        layers: [
          {
            fillEnabled: false,
            stroke: fill,
            strokeWidth: Math.max(2, fs * 0.075),
            lineJoin: "round",
          },
        ],
      };
    case "neon": {
      const haloColor = halo(rgb);
      return {
        layers: [
          {
            fill,
            stroke: haloColor,
            strokeWidth: Math.max(1.4, fs * 0.05),
            shadowColor: haloColor,
            shadowBlur: fs * 0.52,
            shadowOpacity: 1,
            fillAfterStroke: true,
            lineJoin: "round",
          },
        ],
      };
    }
    case "glitch":
      return {
        layers: [
          { dx: -fs * 0.09, dy: fs * 0.02, fill: CYAN, opacity: 0.85 },
          { dx: fs * 0.09, dy: -fs * 0.02, fill: MAGENTA, opacity: 0.85 },
          { fill },
        ],
      };
    case "neonLights": {
      const haloColor = halo(rgb);
      return {
        layers: [
          {
            fillEnabled: false,
            stroke: fill,
            strokeWidth: Math.max(2.2, fs * 0.09),
            shadowColor: haloColor,
            shadowBlur: fs * 0.7,
            shadowOpacity: 1,
            lineJoin: "round",
          },
          {
            fillEnabled: false,
            stroke: rgba(lighten(rgb, 0.72), 1),
            strokeWidth: Math.max(1.2, fs * 0.04),
            shadowColor: WHITE,
            shadowBlur: fs * 0.2,
            shadowOpacity: 0.9,
            lineJoin: "round",
          },
        ],
      };
    }
    case "tvStatic":
      return {
        layers: [
          { dx: -fs * 0.14, dy: fs * 0.07, fill: CYAN, opacity: 0.9 },
          { dx: fs * 0.15, dy: -fs * 0.06, fill: MAGENTA, opacity: 0.85 },
          { dx: fs * 0.04, dy: fs * 0.11, fill: rgba(darken(rgb, 0.45), 0.55) },
          { fill },
        ],
      };
    case "seventies": {
      const gold = mix(rgb, { r: 232, g: 184, b: 74 }, 0.55);
      const rust = mix(rgb, { r: 107, g: 45, b: 18 }, 0.62);
      const orange = mix(rgb, { r: 196, g: 92, b: 38 }, 0.5);
      return {
        layers: [
          {
            dx: fs * 0.11,
            dy: fs * 0.13,
            fill: rgba(rust, 1),
            stroke: rgba(rust, 1),
            strokeWidth: fs * 0.1,
            lineJoin: "round",
          },
          {
            dx: fs * 0.05,
            dy: fs * 0.055,
            fill: rgba(orange, 1),
            stroke: rgba(orange, 1),
            strokeWidth: fs * 0.08,
            lineJoin: "round",
          },
          {
            fill: rgba(gold, 1),
            stroke: rgba(rust, 1),
            strokeWidth: Math.max(1.5, fs * 0.045),
            fillAfterStroke: true,
            lineJoin: "round",
          },
        ],
      };
    }
    case "scifi":
      return {
        layers: [
          {
            fill,
            stroke: rgba(lighten(rgb, 0.4), 1),
            strokeWidth: Math.max(1.2, fs * 0.045),
            shadowColor: fill,
            shadowBlur: fs * 0.42,
            shadowOpacity: 0.88,
            letterSpacing: track,
            lineJoin: "round",
          },
        ],
      };
    case "screenprint":
      return {
        layers: [
          { dx: fs * 0.11, dy: fs * 0.09, fill: rgba(mix(rgb, { r: 196, g: 92, b: 38 }, 0.45), 0.72) },
          { fill, opacity: 0.84 },
        ],
      };
    case "western":
      return {
        layers: [
          { dx: fs * 0.09, dy: fs * 0.11, fill: rgba(darken(rgb, 0.58), 1) },
          {
            fill,
            stroke: rgba(darken(rgb, 0.28), 1),
            strokeWidth: Math.max(2.5, fs * 0.15),
            fillAfterStroke: true,
            lineJoin: "miter",
          },
        ],
      };
    case "graffiti":
      return {
        layers: [
          {
            dx: fs * 0.07,
            dy: fs * 0.08,
            fill: rgba(darken(rgb, 0.72), 1),
            stroke: rgba(darken(rgb, 0.72), 1),
            strokeWidth: fs * 0.24,
            lineJoin: "round",
          },
          {
            fill,
            stroke: rgba(lighten(rgb, 0.18), 1),
            strokeWidth: Math.max(1.6, fs * 0.055),
            fillAfterStroke: true,
            lineJoin: "round",
          },
        ],
      };
    case "bubble":
      return {
        layers: [
          {
            fill,
            stroke: rgba(darken(rgb, 0.12), 1),
            strokeWidth: Math.max(3, fs * 0.2),
            fillAfterStroke: true,
            lineJoin: "round",
          },
          { dx: -fs * 0.045, dy: -fs * 0.05, fill: rgba(lighten(rgb, 0.62), 0.55) },
          { fill, opacity: 0.92 },
        ],
      };
    case "aerobics": {
      const haloColor = halo(rgb);
      return {
        layers: [
          {
            fillEnabled: false,
            stroke: fill,
            strokeWidth: Math.max(1.6, fs * 0.07),
            shadowColor: haloColor,
            shadowBlur: fs * 0.5,
            shadowOpacity: 1,
            fontStyle: italic,
            lineJoin: "round",
          },
          { fill: rgba(lighten(rgb, 0.38), 1), fontStyle: italic },
        ],
      };
    }
    case "arcade":
      return {
        pixelSize: Math.max(4, Math.round(fs / 10)),
        layers: [
          {
            fill,
            stroke: rgba(darken(rgb, 0.45), 1),
            strokeWidth: Math.max(1.5, fs * 0.08),
            fillAfterStroke: true,
            lineJoin: "miter",
          },
        ],
      };
    case "cosmic":
      return {
        layers: [
          {
            fill,
            shadowColor: rgba(mix(rgb, { r: 124, g: 92, b: 255 }, 0.65), 1),
            shadowBlur: fs * 0.7,
            shadowOpacity: 0.95,
          },
          { fill: rgba(lighten(rgb, 0.55), 1) },
        ],
      };
    case "pixel":
      return {
        pixelSize: Math.max(3, Math.round(fs / 14)),
        layers: [
          { dx: -fs * 0.07, fill: CYAN, opacity: 0.85 },
          { dx: fs * 0.07, fill: MAGENTA, opacity: 0.85 },
          { fill },
        ],
      };
    default:
      return { layers: [undefined] };
  }
}

function visualDrawNodes(obj: TextObject, recipe: VisualRecipe, listening: boolean): TextDrawNode[] {
  const nodes: TextDrawNode[] = [];
  if (recipe.bg) {
    const box = textContentBox(obj);
    nodes.push({
      type: "rect",
      props: {
        x: box.x - recipe.bg.padX,
        y: box.y - recipe.bg.padY,
        width: box.width + recipe.bg.padX * 2,
        height: box.height + recipe.bg.padY * 2,
        fill: recipe.bg.fill,
        opacity: recipe.bg.opacity,
        cornerRadius: recipe.bg.radius,
        listening,
        perfectDrawEnabled: false,
      },
    });
  }
  if (listening) {
    const hit = isCurved(obj)
      ? curvedHitBox(obj)
      : { x: 0, y: 0, width: obj.width, height: textVisualHeight(obj) };
    nodes.push({
      type: "rect",
      props: {
        ...hit,
        fill: "rgba(0,0,0,0)",
        listening,
        perfectDrawEnabled: false,
      },
    });
  }
  const last = recipe.layers.length - 1;
  recipe.layers.forEach((paint, i) => {
    for (const props of textShapes(obj, paint)) {
      nodes.push({ type: "text", listening: listening && i === last, props });
    }
  });
  return nodes;
}

function pixelNodes(obj: TextObject, recipe: EffectRecipe, listening: boolean): TextDrawNode[] {
  const pad = Math.ceil(obj.fontSize * 1.45);
  const w = Math.max(8, Math.ceil(obj.width + pad * 2));
  const h = Math.max(8, Math.ceil(textVisualHeight(obj) + pad * 2));
  const pixelSize = recipe.pixelSize ?? 4;
  const visual: VisualRecipe = { bg: recipe.bg, layers: recipe.layers };
  const src = withTempStage(w, h, (layer) => {
    const group = new Konva.Group({ x: pad, y: pad });
    for (const node of visualDrawNodes(obj, visual, false)) {
      if (node.type === "text") group.add(new Konva.Text({ ...node.props, listening: false }));
      if (node.type === "rect") group.add(new Konva.Rect({ ...node.props, listening: false }));
    }
    layer.add(group);
    layer.draw();
    return layer.toCanvas({ pixelRatio: 1 });
  });

  const sw = Math.max(1, Math.round(w / pixelSize));
  const sh = Math.max(1, Math.round(h / pixelSize));
  const small = document.createElement("canvas");
  small.width = sw;
  small.height = sh;
  const sctx = small.getContext("2d");
  if (!sctx) return visualDrawNodes(obj, visual, true);
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(src, 0, 0, sw, sh);

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d");
  if (!octx) return visualDrawNodes(obj, visual, true);
  octx.imageSmoothingEnabled = false;
  octx.drawImage(small, 0, 0, w, h);

  const cropped = cropOpaque(out, 2);
  const hit = isCurved(obj)
    ? curvedHitBox(obj)
    : { x: 0, y: 0, width: obj.width, height: textVisualHeight(obj) };
  const nodes: TextDrawNode[] = [];
  if (listening) {
    nodes.push({
      type: "rect",
      props: { ...hit, fill: "rgba(0,0,0,0.01)", listening: true, perfectDrawEnabled: false },
    });
  }
  nodes.push({
    type: "image",
    props: {
      image: cropped.canvas,
      x: -pad + cropped.x,
      y: -pad + cropped.y,
      width: cropped.canvas.width,
      height: cropped.canvas.height,
      listening,
    },
  });
  return nodes;
}

function halo(c: RGB): string {
  const lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
  if (lum < 0.42) return rgba(mix(c, { r: 255, g: 255, b: 255 }, 0.62), 1);
  return rgba(lighten(c, 0.28), 1);
}

function cropOpaque(src: HTMLCanvasElement, margin: number): { canvas: HTMLCanvasElement; x: number; y: number } {
  const ctx = src.getContext("2d");
  if (!ctx) return { canvas: src, x: 0, y: 0 };
  const { width, height } = src;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return { canvas: src, x: 0, y: 0 };
  minX = Math.max(0, minX - margin);
  minY = Math.max(0, minY - margin);
  maxX = Math.min(width - 1, maxX + margin);
  maxY = Math.min(height - 1, maxY + margin);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const octx = canvas.getContext("2d");
  if (!octx) return { canvas: src, x: 0, y: 0 };
  octx.imageSmoothingEnabled = false;
  octx.drawImage(src, minX, minY, cw, ch, 0, 0, cw, ch);
  return { canvas, x: minX, y: minY };
}

function withTempStage<T>(width: number, height: number, fn: (layer: Konva.Layer) => T): T {
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;left:-99999px;top:0;width:0;height:0;overflow:hidden;";
  document.body.appendChild(el);
  const stage = new Konva.Stage({ container: el, width, height });
  const layer = new Konva.Layer();
  stage.add(layer);
  try {
    return fn(layer);
  } finally {
    stage.destroy();
    el.remove();
  }
}

function parseColor(input: string): RGB {
  const s = input.trim();
  const hex = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    return {
      r: Number.parseInt(h.slice(0, 2), 16),
      g: Number.parseInt(h.slice(2, 4), 16),
      b: Number.parseInt(h.slice(4, 6), 16),
    };
  }
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(s);
  if (rgb) {
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
  }
  return { r: 26, g: 22, b: 20 };
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function lighten(c: RGB, t: number): RGB {
  return mix(c, { r: 255, g: 255, b: 255 }, t);
}

function darken(c: RGB, t: number): RGB {
  return mix(c, { r: 0, g: 0, b: 0 }, t);
}

function rgba(c: RGB, a: number): string {
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}
