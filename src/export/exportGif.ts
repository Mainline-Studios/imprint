import { applyPalette, GIFEncoder, quantize } from "gifenc";
import type { Design } from "../types";
import { downloadBlob, renderPageToImageData, slug } from "./renderPage";

export type GifExportOpts = {
  pixelRatio?: number;
  delayMs?: number;
};

function pageIndices(design: Design, pageIndex: number | "all"): number[] {
  if (pageIndex === "all") return design.pages.map((_, i) => i);
  return [pageIndex];
}

export async function exportGif(
  design: Design,
  pageIndex: number | "all",
  opts: GifExportOpts = {},
): Promise<void> {
  const pixelRatio = Math.min(opts.pixelRatio ?? 1, 2);
  const delayMs = opts.delayMs ?? 1000;
  const indices = pageIndices(design, pageIndex);
  const gif = GIFEncoder();

  for (let n = 0; n < indices.length; n++) {
    const i = indices[n]!;
    const image = await renderPageToImageData(design, design.pages[i]!, pixelRatio);
    const rgba = new Uint8Array(image.data.buffer, image.data.byteOffset, image.data.byteLength);
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    gif.writeFrame(index, image.width, image.height, {
      palette,
      delay: delayMs,
      ...(n === 0 ? { repeat: 0 } : {}),
    });
  }

  gif.finish();
  const bytes = gif.bytes();
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  downloadBlob(new Blob([copy], { type: "image/gif" }), `${slug(design.name)}.gif`);
}
