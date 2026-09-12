import Konva from "konva";
import { loadAssetImage } from "../assets/cache";
import { appendTextDraw } from "../canvas/textEffects";
import { fontOf } from "../fonts/catalog";
import { imageHasFilters, konvaFill, normalizedCrop } from "../lib/fill";
import { stickerById } from "../library/stickers";
import type { CanvasObject, Design, Page } from "../types";

async function withPageStage<T>(
  design: Design,
  page: Page,
  fn: (stage: Konva.Stage) => T | Promise<T>,
): Promise<T> {
  await document.fonts.ready;
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.left = "-99999px";
  el.style.top = "0";
  document.body.appendChild(el);

  const stage = new Konva.Stage({
    container: el,
    width: design.width,
    height: design.height,
  });
  const layer = new Konva.Layer();
  stage.add(layer);
  layer.add(
    new Konva.Rect({
      x: 0,
      y: 0,
      width: design.width,
      height: design.height,
      ...konvaFill(page.background, design.width, design.height),
    }),
  );

  for (const obj of page.objects) {
    if (obj.visible === false) continue;
    layer.add(await buildNode(obj));
  }

  layer.draw();
  try {
    return await fn(stage);
  } finally {
    stage.destroy();
    el.remove();
  }
}

export async function renderPageToDataURL(
  design: Design,
  page: Page,
  opts: { pixelRatio?: number; mimeType?: string; quality?: number } = {},
): Promise<string> {
  const pixelRatio = opts.pixelRatio ?? 2;
  const mimeType = opts.mimeType ?? "image/png";
  return withPageStage(design, page, (stage) =>
    stage.toDataURL({
      pixelRatio,
      mimeType,
      quality: opts.quality,
    }),
  );
}

export async function renderPageToImageData(
  design: Design,
  page: Page,
  pixelRatio = 1,
): Promise<ImageData> {
  return withPageStage(design, page, (stage) => {
    const canvas = stage.toCanvas({ pixelRatio });
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not read page pixels");
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  });
}

async function buildNode(obj: CanvasObject): Promise<Konva.Group> {
  const group = new Konva.Group({
    x: obj.x,
    y: obj.y,
    rotation: obj.rotation,
    opacity: obj.opacity,
  });

  if (obj.type === "text") {
    appendTextDraw(group, obj);
    return group;
  }

  if (obj.type === "image") {
    const image = await loadAssetImage(obj.assetId);
    const cropNorm = normalizedCrop(obj.crop);
    const identity = cropNorm.x === 0 && cropNorm.y === 0 && cropNorm.w === 1 && cropNorm.h === 1;
    const filter = obj.filter;
    const hasFilters = imageHasFilters(filter);
    const filters: Konva.Filter[] = [];
    if (filter?.brighten) filters.push(Konva.Filters.Brighten);
    if (filter?.contrast) filters.push(Konva.Filters.Contrast);
    if (filter?.grayscale) filters.push(Konva.Filters.Grayscale);
    if (filter?.blur) filters.push(Konva.Filters.Blur);
    const node = new Konva.Image({
      image,
      width: obj.width,
      height: obj.height,
      crop: identity
        ? undefined
        : {
            x: cropNorm.x * image.naturalWidth,
            y: cropNorm.y * image.naturalHeight,
            width: Math.max(1, cropNorm.w * image.naturalWidth),
            height: Math.max(1, cropNorm.h * image.naturalHeight),
          },
      filters: hasFilters ? filters : undefined,
      brightness: filter?.brighten ?? 0,
      contrast: filter?.contrast ?? 0,
      blurRadius: filter?.blur ?? 0,
    });
    group.add(node);
    if (hasFilters) node.cache();
    return group;
  }

  if (obj.type === "button") {
    group.add(
      new Konva.Rect({
        width: obj.width,
        height: obj.height,
        fill: obj.fill,
        cornerRadius: obj.cornerRadius,
      }),
    );
    group.add(
      new Konva.Text({
        width: obj.width,
        height: obj.height,
        text: obj.text,
        fontFamily: fontOf(obj.fontFamily),
        fontSize: obj.fontSize,
        fontStyle: obj.fontWeight >= 600 ? "bold" : "normal",
        fill: obj.textFill,
        align: "center",
        verticalAlign: "middle",
      }),
    );
    return group;
  }

  if (obj.type === "sticker") {
    const def = stickerById(obj.sticker);
    if (def) {
      group.add(
        new Konva.Path({
          data: def.path,
          fill: obj.fill,
          stroke: obj.fill,
          strokeWidth: 0.6,
          lineJoin: "round",
          lineCap: "round",
          scaleX: obj.width / def.view,
          scaleY: obj.height / def.view,
        }),
      );
    }
    return group;
  }

  const fill = konvaFill(obj.fill, obj.width, obj.height);
  if (obj.shape === "ellipse") {
    group.add(
      new Konva.Ellipse({
        x: obj.width / 2,
        y: obj.height / 2,
        radiusX: obj.width / 2,
        radiusY: obj.height / 2,
        ...fill,
        stroke: obj.strokeWidth ? obj.stroke : undefined,
        strokeWidth: obj.strokeWidth,
      }),
    );
  } else if (obj.shape === "triangle") {
    group.add(
      new Konva.Line({
        points: [obj.width / 2, 0, obj.width, obj.height, 0, obj.height],
        closed: true,
        ...fill,
        stroke: obj.strokeWidth ? obj.stroke : undefined,
        strokeWidth: obj.strokeWidth,
      }),
    );
  } else {
    group.add(
      new Konva.Rect({
        width: obj.width,
        height: obj.height,
        ...fill,
        stroke: obj.strokeWidth ? obj.stroke : undefined,
        strokeWidth: obj.strokeWidth,
        cornerRadius: obj.shape === "line" ? 99 : obj.cornerRadius,
      }),
    );
  }
  return group;
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function slug(name: string): string {
  const s = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return s || "imprint";
}
