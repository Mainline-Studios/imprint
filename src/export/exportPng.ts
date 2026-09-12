import type { Design } from "../types";
import { downloadDataUrl, renderPageToDataURL, slug } from "./renderPage";

export type RasterFormat = "png" | "jpeg" | "webp";

export type RasterExportOpts = {
  format?: RasterFormat;
  pixelRatio?: number;
  quality?: number;
};

const MIME: Record<RasterFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

const EXT: Record<RasterFormat, string> = {
  png: "png",
  jpeg: "jpg",
  webp: "webp",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function pageIndices(design: Design, pageIndex: number | "all"): number[] {
  if (pageIndex === "all") return design.pages.map((_, i) => i);
  return [pageIndex];
}

function fileName(base: string, ext: string, index: number, total: number): string {
  if (total === 1) return `${base}.${ext}`;
  return `${base}-${index + 1}.${ext}`;
}

export async function exportRaster(
  design: Design,
  pageIndex: number | "all",
  opts: RasterExportOpts = {},
): Promise<void> {
  const format = opts.format ?? "png";
  const pixelRatio = opts.pixelRatio ?? 2;
  const quality = format === "png" ? undefined : (opts.quality ?? 0.92);
  const base = slug(design.name);
  const indices = pageIndices(design, pageIndex);
  const ext = EXT[format];

  for (let n = 0; n < indices.length; n++) {
    const i = indices[n]!;
    const url = await renderPageToDataURL(design, design.pages[i]!, {
      pixelRatio,
      mimeType: MIME[format],
      quality,
    });
    downloadDataUrl(url, fileName(base, ext, i, indices.length));
    if (n < indices.length - 1) await sleep(250);
  }
}

export async function exportPng(design: Design, pageIndex: number | "all"): Promise<void> {
  return exportRaster(design, pageIndex, { format: "png" });
}
