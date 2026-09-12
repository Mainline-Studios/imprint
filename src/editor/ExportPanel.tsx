import { useEffect, useState } from "react";
import { exportGif } from "../export/exportGif";
import { exportHtml, previewHtml } from "../export/exportHtml";
import { exportPdf } from "../export/exportPdf";
import { exportRaster, type RasterFormat } from "../export/exportPng";
import { renderPageToDataURL } from "../export/renderPage";
import { useDocumentStore } from "../store/document";
import { isEmailSize, isHtmlCanvas } from "../templates/presets";
import type { Design } from "../types";

export type ExportFormat = RasterFormat | "pdf" | "gif" | "html";
export type ExportPages = "this" | "all";
export type ExportScale = 1 | 2 | 3;
export type ExportQuality = "high" | "medium";
export type GifDelay = 500 | 1000 | 2000;

const QUALITY: Record<ExportQuality, number> = {
  high: 0.92,
  medium: 0.75,
};

export type ExportOpts = {
  format: ExportFormat;
  pages: ExportPages;
  scale: ExportScale;
  quality: ExportQuality;
  delay: GifDelay;
};

export async function runChosenExport(design: Design, pageIndex: number | "all", opts: ExportOpts): Promise<void> {
  const quality = QUALITY[opts.quality];
  if (opts.format === "gif") {
    await exportGif(design, pageIndex, {
      pixelRatio: Math.min(opts.scale, 2) as 1 | 2,
      delayMs: opts.delay,
    });
    return;
  }
  if (opts.format === "html") {
    await exportHtml(design, pageIndex);
    return;
  }
  if (opts.format === "pdf") {
    await exportPdf(design, pageIndex, { pixelRatio: opts.scale, quality });
    return;
  }
  await exportRaster(design, pageIndex, {
    format: opts.format,
    pixelRatio: opts.scale,
    quality,
  });
}

export function ExportPanel({ onDownload }: { onDownload: (opts: ExportOpts) => void }) {
  const design = useDocumentStore((s) => s.design);
  const currentPageIndex = useDocumentStore((s) => s.currentPageIndex);
  const updatedAt = design?.updatedAt;
  const htmlOnly = Boolean(design && isHtmlCanvas(design.width, design.height));
  const email = Boolean(design && isEmailSize(design.width, design.height));
  const [format, setFormat] = useState<ExportFormat>(htmlOnly ? "html" : "png");
  const [pages, setPages] = useState<ExportPages>(htmlOnly && (design?.pages.length ?? 1) > 1 ? "all" : "this");
  const [scale, setScale] = useState<ExportScale>(2);
  const [quality, setQuality] = useState<ExportQuality>("high");
  const [delay, setDelay] = useState<GifDelay>(1000);
  const [preview, setPreview] = useState<string[]>([]);
  const [frame, setFrame] = useState(0);
  const [loading, setLoading] = useState(true);

  const chosen = htmlOnly ? "html" : format;
  const gif = chosen === "gif";
  const html = chosen === "html";
  const lossy = chosen === "jpeg" || chosen === "webp" || chosen === "pdf";
  const animate = preview.length > 1 && (gif || pages === "all") && !html;
  const shown = preview[Math.min(frame, preview.length - 1)];
  const outW = design ? Math.round(design.width * (gif ? Math.min(scale, 2) : html ? 1 : scale)) : 0;
  const outH = design ? Math.round(design.height * (gif ? Math.min(scale, 2) : html ? 1 : scale)) : 0;
  const frameCount = pages === "all" ? (design?.pages.length ?? 1) : 1;

  useEffect(() => {
    if (!design) return;
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        const unique = pages === "all" ? design.pages.map((_, i) => i) : [currentPageIndex];
        const urls: string[] = [];
        for (const i of unique) {
          const page = design.pages[i];
          if (!page) continue;
          urls.push(await renderPageToDataURL(design, page, { pixelRatio: 1, mimeType: "image/png" }));
          if (cancelled) return;
        }
        if (cancelled) return;
        setPreview(urls);
        setFrame(0);
        setLoading(false);
      })().catch(() => {
        if (!cancelled) setLoading(false);
      });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [design, currentPageIndex, pages, updatedAt]);

  useEffect(() => {
    if (!animate) return;
    const id = window.setInterval(() => {
      setFrame((n) => (n + 1) % preview.length);
    }, gif ? delay : 900);
    return () => window.clearInterval(id);
  }, [animate, delay, gif, preview.length]);

  function pickFormat(next: ExportFormat) {
    setFormat(next);
    if (next === "gif") {
      if (scale === 3) setScale(1);
      if ((design?.pages.length ?? 1) > 1) setPages("all");
    }
    if (next === "html" && (design?.pages.length ?? 1) > 1) setPages("all");
  }

  function downloadOpts(): ExportOpts {
    return { format: chosen, pages, scale, quality, delay };
  }

  function openSite() {
    if (!design) return;
    const pageIndex = pages === "all" ? "all" : currentPageIndex;
    void previewHtml(design, pageIndex);
    useDocumentStore.getState().setExportOpen(false);
  }

  return (
    <div className="export-panel" role="dialog" aria-label="Export">
      <div className="export-preview" aria-live="polite">
        {loading || !shown ? (
          <div
            className="export-preview-empty"
            style={design ? { aspectRatio: `${design.width} / ${design.height}` } : undefined}
          >
            Rendering preview…
          </div>
        ) : (
          <img
            src={shown}
            alt=""
            className="export-preview-img"
            style={design ? { aspectRatio: `${design.width} / ${design.height}` } : undefined}
          />
        )}
        <div className="export-preview-meta">
          <span>
            {outW} × {outH}
            {gif ? " GIF" : html ? " webpage" : chosen === "pdf" ? " PDF" : ` ${chosen.toUpperCase()}`}
          </span>
          <span>
            {frameCount === 1
              ? "1 page"
              : gif
                ? `${frameCount} frames`
                : `${frameCount} pages`}
            {animate && preview.length > 1 ? ` · ${frame + 1}/${preview.length}` : ""}
          </span>
        </div>
      </div>

      <div className="export-controls">
        {htmlOnly ? (
          <p className="export-hint">
            {email
              ? "This is a newsletter. Open it in a browser, or download the HTML to send later."
              : "This is a webpage. Open the site to preview it, or download the HTML file."}
          </p>
        ) : (
          <div className="field">
            <span>Format</span>
            <div className="export-formats">
              <FormatBtn value="png" current={chosen} onSelect={pickFormat} hint="lossless">
                PNG
              </FormatBtn>
              <FormatBtn value="jpeg" current={chosen} onSelect={pickFormat}>
                JPEG
              </FormatBtn>
              <FormatBtn value="webp" current={chosen} onSelect={pickFormat}>
                WebP
              </FormatBtn>
              <FormatBtn value="gif" current={chosen} onSelect={pickFormat} hint="animated">
                GIF
              </FormatBtn>
              <FormatBtn value="pdf" current={chosen} onSelect={pickFormat}>
                PDF
              </FormatBtn>
              <FormatBtn value="html" current={chosen} onSelect={pickFormat} hint="links work">
                Webpage
              </FormatBtn>
            </div>
          </div>
        )}
        <div className="field">
          <span>Pages</span>
          <div className="seg">
            <button type="button" className={pages === "this" ? "on" : undefined} onClick={() => setPages("this")}>
              This page
            </button>
            <button type="button" className={pages === "all" ? "on" : undefined} onClick={() => setPages("all")}>
              All pages
            </button>
          </div>
          {gif && pages === "this" ? <p className="export-hint">One-frame GIF. Use all pages to animate.</p> : null}
          {gif && pages === "all" && frameCount < 2 ? (
            <p className="export-hint">Add pages to animate between them.</p>
          ) : null}
          {html ? (
            <p className="export-hint">
              {email
                ? "Each page opens one at a time. Buttons can go to a website, another page, or an email address. Use all pages for a longer note."
                : htmlOnly
                  ? "Each page opens like a real website. Buttons can go to another page or a web address. Use all pages for a multi-page site."
                  : "Saves a webpage you can open in any browser. Buttons keep their links. Use all pages for a multi-page site."}
            </p>
          ) : null}
        </div>
        {html ? null : (
          <>
            <div className="field">
              <span>Scale</span>
              <div className="seg">
                <button type="button" className={scale === 1 ? "on" : undefined} onClick={() => setScale(1)}>
                  1×
                </button>
                <button type="button" className={scale === 2 ? "on" : undefined} onClick={() => setScale(2)}>
                  2×
                </button>
                {!gif ? (
                  <button type="button" className={scale === 3 ? "on" : undefined} onClick={() => setScale(3)}>
                    3×
                  </button>
                ) : null}
              </div>
              <p className="export-hint">
                {gif ? "GIF caps at 2×" : scale === 1 ? "Screen" : scale === 2 ? "Default" : "Print-ish"}
              </p>
            </div>
            {gif ? (
              <div className="field">
                <span>Frame delay</span>
                <div className="seg">
                  <button type="button" className={delay === 500 ? "on" : undefined} onClick={() => setDelay(500)}>
                    0.5s
                  </button>
                  <button type="button" className={delay === 1000 ? "on" : undefined} onClick={() => setDelay(1000)}>
                    1s
                  </button>
                  <button type="button" className={delay === 2000 ? "on" : undefined} onClick={() => setDelay(2000)}>
                    2s
                  </button>
                </div>
              </div>
            ) : null}
            {lossy ? (
              <div className="field">
                <span>Quality</span>
                <div className="seg">
                  <button type="button" className={quality === "high" ? "on" : undefined} onClick={() => setQuality("high")}>
                    High
                  </button>
                  <button
                    type="button"
                    className={quality === "medium" ? "on" : undefined}
                    onClick={() => setQuality("medium")}
                  >
                    Medium
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
        <div className="export-actions">
          {html ? (
            <button type="button" className="btn-primary" onClick={openSite}>
              Open site
            </button>
          ) : null}
          <button
            type="button"
            className={html ? "btn-secondary" : "btn-primary"}
            onClick={() => onDownload(downloadOpts())}
          >
            {html ? "Download HTML" : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormatBtn({
  value,
  current,
  onSelect,
  hint,
  children,
}: {
  value: ExportFormat;
  current: ExportFormat;
  onSelect: (format: ExportFormat) => void;
  hint?: string;
  children: string;
}) {
  return (
    <button
      type="button"
      className={current === value ? "on" : undefined}
      aria-pressed={current === value}
      aria-label={hint ? `${children} (${hint})` : children}
      onClick={() => onSelect(value)}
    >
      {children}
      {hint ? <small>{hint}</small> : null}
    </button>
  );
}
