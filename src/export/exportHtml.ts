import { fontOf } from "../fonts/catalog";
import { cssFill, cssImageFilter, cropObjectPosition } from "../lib/fill";
import { sanitizeHref } from "../lib/href";
import pageRuntimeSource from "./pageRuntime.js?raw";
import { cssTiming, resolvePageTransition } from "../lib/pageTransitions";
import { stickerById } from "../library/stickers";
import { getAsset } from "../persist/db";
import type { ButtonObject, CanvasObject, Design, ImageObject, Page, ShapeObject, StickerObject, TextObject } from "../types";
import { downloadBlob, slug } from "./renderPage";

const HTML_TYPE = "text/html;charset=utf-8";

export async function buildHtml(design: Design, pageIndex: number | "all"): Promise<string> {
  const indexes = pageIndex === "all" ? design.pages.map((_, i) => i) : [pageIndex];
  const pages = indexes
    .map((i) => ({ index: i, page: design.pages[i] }))
    .filter((entry): entry is { index: number; page: Page } => entry.page != null);

  const assetIds = new Set<string>();
  for (const { page } of pages) {
    for (const obj of page.objects) {
      if (obj.type === "image") assetIds.add(obj.assetId);
    }
  }

  const assets = new Map<string, string>();
  await Promise.all(
    [...assetIds].map(async (id) => {
      const rec = await getAsset(id);
      if (!rec) return;
      assets.set(id, await blobToDataUrl(rec.blob));
    }),
  );

  const sections = pages
    .map(({ index, page }, i) => renderPage(design, page, index, assets, i === 0))
    .join("\n");
  const rulesJson = JSON.stringify(transitionRules(pages)).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(design.name)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      height: 100%;
      overflow: hidden;
      background: #ece6db;
      color: #1a1614;
      font-family: Inter, system-ui, sans-serif;
    }
    .page {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      container-type: inline-size;
      transform-origin: center center;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 0.16s ease, visibility 0.16s ease;
    }
    .page.is-on {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }
    .el {
      position: absolute;
      transform-origin: top left;
    }
    .var-value {
      display: inline-block;
      border: 0.08em solid currentColor;
      border-radius: 0.28em;
      padding: 0 0.32em;
      margin: 0 0.08em;
      line-height: 1.15;
      vertical-align: baseline;
    }
    .mm-layer {
      position: fixed;
      inset: 0;
      z-index: 40;
      pointer-events: none;
      overflow: hidden;
    }
    @media (prefers-reduced-motion: reduce) {
      .page, .mm-layer { transition: none !important; animation: none !important; }
    }
  </style>
</head>
<body>
${sections}
  <script>
${pageRuntime(rulesJson)}
  </script>
</body>
</html>
`;
}

function transitionRules(pages: { index: number; page: Page }[]): Record<string, { kind: string; ms: number; dir: string; ease: string }> {
  const numById = new Map(pages.map(({ index, page }) => [page.id, index + 1]));
  const rules: Record<string, { kind: string; ms: number; dir: string; ease: string }> = {};
  for (const { index, page } of pages) {
    for (const jump of page.transitions ?? []) {
      const resolved = resolvePageTransition(jump);
      if (!resolved) continue;
      const to = numById.get(jump.toId);
      if (to == null) continue;
      rules[`${index + 1}>${to}`] = {
        kind: resolved.kind,
        ms: resolved.durationMs,
        dir: resolved.direction,
        ease: cssTiming(resolved.easing),
      };
    }
  }
  return rules;
}

function pageRuntime(rulesJson: string): string {
  return pageRuntimeSource.replace("__RULES_JSON__", () => rulesJson);
}

export async function exportHtml(design: Design, pageIndex: number | "all"): Promise<void> {
  const html = await buildHtml(design, pageIndex);
  downloadBlob(new Blob([html], { type: HTML_TYPE }), `${slug(design.name)}.html`);
}

export async function previewHtml(design: Design, pageIndex: number | "all"): Promise<void> {
  const tab = window.open("about:blank", "_blank");
  if (tab) {
    try {
      tab.document.open();
      tab.document.write(
        `<!DOCTYPE html><html><head><title>${escapeHtml(design.name)}</title></head><body style="margin:0;font-family:system-ui,sans-serif;padding:24px;color:#3f3833;background:#ece6db">Opening site…</body></html>`,
      );
      tab.document.close();
    } catch {
      /* tab may be cross-origin after some blockers */
    }
  }
  const html = await buildHtml(design, pageIndex);
  const url = URL.createObjectURL(new Blob([html], { type: HTML_TYPE }));
  if (tab && !tab.closed) {
    tab.location.replace(url);
  } else {
    window.open(url, "_blank");
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function renderPage(
  design: Design,
  page: Page,
  index: number,
  assets: Map<string, string>,
  active: boolean,
): string {
  const kids = page.objects
    .filter((obj) => obj.visible !== false)
    .map((obj) => renderObject(design, obj, assets))
    .join("");
  const on = active ? " is-on" : "";
  const hidden = active ? "" : ' aria-hidden="true"';
  return `  <section class="page${on}" id="page-${index + 1}"${hidden} style="background:${escapeAttr(cssFill(page.background))}">${kids}
  </section>`;
}

function renderObject(design: Design, obj: CanvasObject, assets: Map<string, string>): string {
  if (obj.type === "text") return renderText(design, obj);
  if (obj.type === "image") return renderImage(design, obj, assets);
  if (obj.type === "button") return renderButton(design, obj);
  if (obj.type === "sticker") return renderSticker(design, obj);
  return renderShape(design, obj);
}

function moveAttrs(obj: CanvasObject): string {
  const rot = ` data-rot="${Number.isFinite(obj.rotation) ? obj.rotation : 0}"`;
  const name = obj.name?.trim();
  if (name) return ` data-mm="${escapeAttr(name)}"${rot}`;
  const auto = autoMoveKey(obj);
  return auto ? ` data-mm-auto="${escapeAttr(auto)}"${rot}` : rot;
}

function autoMoveKey(obj: CanvasObject): string | null {
  if (obj.type === "text" || obj.type === "button") {
    const text = obj.text.replace(/\s+/g, " ").trim();
    return text ? `${obj.type}:${text}` : null;
  }
  if (obj.type === "image") return `image:${obj.assetId}`;
  if (obj.type === "sticker") return `sticker:${obj.sticker}`;
  return null;
}

function renderText(design: Design, obj: TextObject): string {
  const style = [
    box(obj, design.width, design.height, false),
    `color:${escapeAttr(obj.fill)}`,
    `font-family:${escapeAttr(fontOf(obj.fontFamily))}`,
    `font-size:${cqw(obj.fontSize, design.width)}`,
    `font-weight:${obj.fontWeight}`,
    `text-align:${obj.align}`,
    `white-space:pre-wrap`,
    `line-height:${obj.lineHeight ?? 1.25}`,
    obj.letterSpacing ? `letter-spacing:${cqw(obj.letterSpacing, design.width)}` : "",
    obj.textTransform === "uppercase" ? "text-transform:uppercase" : "",
    obj.textTransform === "small-caps" ? "font-variant:small-caps" : "",
  ]
    .filter(Boolean)
    .join(";");
  const scored = obj.text.includes("{{points}}");
  const body = scored
    ? obj.text
        .split("{{points}}")
        .map((bit, index, all) => {
          const chunk = escapeHtml(bit);
          return index < all.length - 1 ? `${chunk}<span class="var-value">0</span>` : chunk;
        })
        .join("")
    : escapeHtml(obj.text);
  const slot = scored ? ` data-points-slot="${escapeAttr(obj.text)}"` : "";
  return `<div class="el"${moveAttrs(obj)}${slot} style="${style}">${body}</div>`;
}

function renderImage(design: Design, obj: ImageObject, assets: Map<string, string>): string {
  const src = assets.get(obj.assetId);
  if (!src) return "";
  const extras = ["object-fit:cover"];
  const pos = cropObjectPosition(obj.crop);
  if (pos) extras.push(`object-position:${pos}`);
  const filter = cssImageFilter(obj.filter);
  if (filter) extras.push(`filter:${filter}`);
  return `<img class="el"${moveAttrs(obj)} alt="" src="${escapeAttr(src)}" style="${box(obj, design.width, design.height, true)}${extras.join(";")}" />`;
}

function renderButton(design: Design, obj: ButtonObject): string {
  const href = sanitizeHref(obj.href);
  const style = [
    box(obj, design.width, design.height, true),
    "display:flex",
    "align-items:center",
    "justify-content:center",
    `background:${escapeAttr(obj.fill)}`,
    `color:${escapeAttr(obj.textFill)}`,
    `border-radius:${cqw(obj.cornerRadius, design.width)}`,
    `font-family:${escapeAttr(fontOf(obj.fontFamily))}`,
    `font-size:${cqw(obj.fontSize, design.width)}`,
    `font-weight:${obj.fontWeight}`,
    "text-decoration:none",
    "text-align:center",
    "line-height:1.2",
    "padding:0 3%",
  ].join(";");
  const label = escapeHtml(obj.text);
  const points =
    typeof obj.points === "number" && Number.isFinite(obj.points) ? ` data-points="${obj.points}"` : "";
  if (!href) return `<span class="el"${moveAttrs(obj)}${points} style="${style}">${label}</span>`;
  const extra =
    href.startsWith("#") || /^(mailto:|tel:)/i.test(href) ? "" : ` target="_blank" rel="noopener noreferrer"`;
  return `<a class="el"${moveAttrs(obj)} href="${escapeAttr(href)}"${extra}${points} style="${style}">${label}</a>`;
}

function renderShape(design: Design, obj: ShapeObject): string {
  const extras = [`background:${escapeAttr(cssFill(obj.fill))}`];
  if (obj.shape === "ellipse") extras.push("border-radius:50%");
  else if (obj.shape === "line") extras.push("border-radius:99px");
  else if (obj.shape === "triangle") extras.push("clip-path:polygon(50% 0,100% 100%,0 100%)");
  else extras.push(`border-radius:${cqw(obj.cornerRadius, design.width)}`);
  if (obj.strokeWidth) extras.push(`border:${obj.strokeWidth}px solid ${escapeAttr(obj.stroke)}`);
  return `<div class="el"${moveAttrs(obj)} style="${box(obj, design.width, design.height, true)}${extras.join(";")}"></div>`;
}

function renderSticker(design: Design, obj: StickerObject): string {
  const def = stickerById(obj.sticker);
  if (!def) return "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${def.view} ${def.view}" width="100%" height="100%"><path d="${escapeAttr(def.path)}" fill="${escapeAttr(obj.fill)}" stroke="${escapeAttr(obj.fill)}" stroke-width="0.6"/></svg>`;
  return `<div class="el"${moveAttrs(obj)} style="${box(obj, design.width, design.height, true)}">${svg}</div>`;
}

function box(
  obj: { x: number; y: number; width: number; rotation: number; opacity: number; height?: number },
  pageW: number,
  pageH: number,
  withHeight: boolean,
): string {
  const height = withHeight && obj.height != null ? `height:${pct(obj.height, pageH)};` : "";
  return `left:${pct(obj.x, pageW)};top:${pct(obj.y, pageH)};width:${pct(obj.width, pageW)};${height}transform:rotate(${obj.rotation}deg);opacity:${obj.opacity};`;
}

function pct(n: number, total: number): string {
  return `${(n / total) * 100}%`;
}

function cqw(px: number, pageWidth: number): string {
  return `${(px / pageWidth) * 100}cqw`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
