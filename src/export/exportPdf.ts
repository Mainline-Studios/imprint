import { jsPDF } from "jspdf";
import type { Design } from "../types";
import { renderPageToDataURL, slug } from "./renderPage";

export type PdfExportOpts = {
  pixelRatio?: number;
  quality?: number;
};

function pageIndices(design: Design, pageIndex: number | "all"): number[] {
  if (pageIndex === "all") return design.pages.map((_, i) => i);
  return [pageIndex];
}

export async function exportPdf(
  design: Design,
  pageIndex: number | "all" = "all",
  opts: PdfExportOpts = {},
): Promise<void> {
  const orientation = design.width >= design.height ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [design.width, design.height],
    compress: true,
  });

  const indices = pageIndices(design, pageIndex);
  const pixelRatio = opts.pixelRatio ?? 2;
  const quality = opts.quality ?? 0.92;

  for (let n = 0; n < indices.length; n++) {
    const i = indices[n]!;
    if (n > 0) pdf.addPage([design.width, design.height], orientation);
    const url = await renderPageToDataURL(design, design.pages[i]!, {
      pixelRatio,
      mimeType: "image/jpeg",
      quality,
    });
    pdf.addImage(url, "JPEG", 0, 0, design.width, design.height);
  }

  pdf.save(`${slug(design.name)}.pdf`);
}
