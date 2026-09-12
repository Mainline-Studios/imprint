import { stickerById } from "../library/stickers";
import type { ButtonObject, CanvasObject, FontFamily, FontWeight, ShapeKind, StickerObject, TextObject } from "../types";
import { uuid } from "./ids";

const INK = "#1a1614";

export function unit(width: number, height: number): number {
  return Math.min(width, height) / 1080;
}

export function createText(
  canvas: { width: number; height: number },
  kind: "heading" | "subheading" | "body",
  at?: { x: number; y: number },
  fontFamily?: FontFamily,
): TextObject {
  const u = unit(canvas.width, canvas.height);
  const presets = {
    heading: {
      text: "Add a heading",
      fontFamily: "Playfair Display" as FontFamily,
      fontSize: Math.round(64 * u),
      fontWeight: 600 as const,
      width: Math.round(canvas.width * 0.72),
    },
    subheading: {
      text: "Add a subheading",
      fontFamily: "Inter" as FontFamily,
      fontSize: Math.round(32 * u),
      fontWeight: 500 as const,
      width: Math.round(canvas.width * 0.64),
    },
    body: {
      text: "Add a little body text",
      fontFamily: "Inter" as FontFamily,
      fontSize: Math.round(22 * u),
      fontWeight: 400 as const,
      width: Math.round(canvas.width * 0.56),
    },
  };
  const p = presets[kind];
  const width = p.width;
  const height = p.fontSize * 1.3;
  return {
    id: uuid(),
    type: "text",
    x: at?.x ?? (canvas.width - width) / 2,
    y: at?.y ?? (canvas.height - height) / 2,
    width,
    rotation: 0,
    text: p.text,
    fontFamily: fontFamily ?? p.fontFamily,
    fontSize: p.fontSize,
    fontWeight: p.fontWeight,
    align: "center",
    fill: INK,
    opacity: 1,
  };
}

export function createShape(
  canvas: { width: number; height: number },
  shape: ShapeKind,
  at?: { x: number; y: number },
): CanvasObject {
  const u = unit(canvas.width, canvas.height);
  const sizes: Record<ShapeKind, { width: number; height: number }> = {
    rect: { width: 280 * u, height: 180 * u },
    ellipse: { width: 220 * u, height: 220 * u },
    triangle: { width: 220 * u, height: 200 * u },
    line: { width: 280 * u, height: 16 * u },
  };
  const s = sizes[shape];
  return {
    id: uuid(),
    type: "shape",
    shape,
    x: at?.x ?? (canvas.width - s.width) / 2,
    y: at?.y ?? (canvas.height - s.height) / 2,
    width: s.width,
    height: s.height,
    rotation: 0,
    fill: shape === "line" ? INK : "#d8cbb8",
    stroke: shape === "line" ? INK : "transparent",
    strokeWidth: shape === "line" ? Math.max(4, 8 * u) : 0,
    cornerRadius: shape === "rect" ? 0 : 0,
    opacity: 1,
  };
}

export function createImageObject(
  canvas: { width: number; height: number },
  assetId: string,
  natural: { width: number; height: number },
  at?: { x: number; y: number },
): CanvasObject {
  const maxW = canvas.width * 0.5;
  const maxH = canvas.height * 0.5;
  const scale = Math.min(maxW / natural.width, maxH / natural.height, 1);
  const width = natural.width * scale;
  const height = natural.height * scale;
  return {
    id: uuid(),
    type: "image",
    x: at?.x ?? (canvas.width - width) / 2,
    y: at?.y ?? (canvas.height - height) / 2,
    width,
    height,
    rotation: 0,
    assetId,
    opacity: 1,
  };
}

export function createButton(
  canvas: { width: number; height: number },
  at?: { x: number; y: number },
): ButtonObject {
  const u = unit(canvas.width, canvas.height);
  const width = Math.round(280 * u);
  const height = Math.round(64 * u);
  return {
    id: uuid(),
    type: "button",
    x: at?.x ?? (canvas.width - width) / 2,
    y: at?.y ?? (canvas.height - height) / 2,
    width,
    height,
    rotation: 0,
    text: "Click me",
    href: "https://",
    fill: "#7a2e2e",
    textFill: "#f6f1e8",
    fontFamily: "Inter",
    fontSize: Math.round(22 * u),
    fontWeight: 600 as FontWeight,
    cornerRadius: Math.round(8 * u),
    opacity: 1,
  };
}

export function createSticker(
  canvas: { width: number; height: number },
  stickerId: string,
  at?: { x: number; y: number },
): StickerObject {
  const u = unit(canvas.width, canvas.height);
  const def = stickerById(stickerId);
  const size = 160 * u;
  return {
    id: uuid(),
    type: "sticker",
    sticker: def?.id ?? stickerId,
    x: at?.x ?? (canvas.width - size) / 2,
    y: at?.y ?? (canvas.height - size) / 2,
    width: size,
    height: size,
    rotation: 0,
    fill: "#7a2e2e",
    opacity: 1,
  };
}
