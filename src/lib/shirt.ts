import { isTshirtSize } from "../templates/presets";
import type { Design, Page, ShirtMeta, ShirtView } from "../types";
import { uuid } from "./ids";

export const SHIRT_VIEWS: ShirtView[] = ["front", "back", "left-shoulder", "right-shoulder"];

export const SHIRT_VIEW_LABELS: Record<ShirtView, string> = {
  front: "Front",
  back: "Back",
  "left-shoulder": "L shoulder",
  "right-shoulder": "R shoulder",
};

export const SHIRT_SWATCHES = [
  { name: "Ink", color: "#1a1614" },
  { name: "Oxblood", color: "#7a2e2e" },
  { name: "Forest", color: "#2f4a3c" },
  { name: "Navy", color: "#1e2d3d" },
  { name: "Cream", color: "#fbf7f0" },
  { name: "White", color: "#ffffff" },
] as const;

export const DEFAULT_SHIRT_COLOR = "#1a1614";
const LIGHT_SHIRT_COLOR = "#fbf7f0";

const LIGHT_PAGE_BACKGROUNDS = new Set([
  "#ffffff",
  "#fff",
  "#fbf7f0",
  "#f6f1e8",
  "#efe8dc",
  "#fffdf9",
  "#f5f0e8",
]);

export function isShirtView(value: string | undefined): value is ShirtView {
  return value === "front" || value === "back" || value === "left-shoulder" || value === "right-shoulder";
}

export function shirtViewOf(page: Page | undefined, index: number): ShirtView {
  if (page && isShirtView(page.role)) return page.role;
  return SHIRT_VIEWS[index] ?? "front";
}

export function shirtViewPhrase(view: ShirtView): string {
  if (view === "front") return "Front";
  if (view === "back") return "Back";
  if (view === "left-shoulder") return "left shoulder";
  return "right shoulder";
}

export function emptyShirtPage(role: ShirtView, background = "#ffffff"): Page {
  return { id: uuid(), background, objects: [], role };
}

export function defaultShirtColor(pages: Page[]): string {
  const bg = (pages[0]?.background ?? "").toLowerCase();
  if (LIGHT_PAGE_BACKGROUNDS.has(bg)) return LIGHT_SHIRT_COLOR;
  return DEFAULT_SHIRT_COLOR;
}

export function defaultShirtMeta(pages: Page[]): ShirtMeta {
  return { color: defaultShirtColor(pages), neck: "crew" };
}

export function padShirtPages(pages: Page[]): Page[] {
  const hasRoles = pages.some((page) => isShirtView(page.role));
  if (!hasRoles) {
    const assigned = pages.map((page, i) => {
      const role = SHIRT_VIEWS[i];
      return role ? { ...page, role } : page;
    });
    const missing = SHIRT_VIEWS.slice(pages.length).map((role) => emptyShirtPage(role));
    return [...assigned, ...missing];
  }

  const have = new Set(pages.map((page) => page.role).filter(isShirtView));
  const missing = SHIRT_VIEWS.filter((role) => !have.has(role)).map((role) => emptyShirtPage(role));
  if (missing.length === 0) return pages;
  return [...pages, ...missing];
}

export function ensureShirtDesign(design: Design): Design {
  if (!isTshirtSize(design.width, design.height)) return design;
  const pages = padShirtPages(design.pages);
  const shirt = design.shirt ?? defaultShirtMeta(pages);
  if (pages === design.pages && design.shirt) return design;
  return { ...design, pages, shirt };
}

export function canDeleteShirtPage(design: Design, index: number): boolean {
  if (design.pages.length <= 1) return false;
  if (!isTshirtSize(design.width, design.height)) return true;
  return !isShirtView(design.pages[index]?.role);
}

export function isLightColor(color: string): boolean {
  const hex = color.trim().toLowerCase();
  if (hex === "white" || hex === "#fff" || hex === "#ffffff") return true;
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = m[1];
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 168;
}

export type PrintArea = { x: number; y: number; width: number; height: number };

export function shirtPrintArea(view: ShirtView, canvasW: number, canvasH: number): PrintArea {
  if (view === "left-shoulder" || view === "right-shoulder") {
    const width = canvasW * 0.4;
    const height = canvasH * 0.3;
    const y = canvasH * 0.16;
    const x = view === "left-shoulder" ? canvasW * 0.14 : canvasW * 0.46;
    return { x, y, width, height };
  }
  return {
    x: canvasW * 0.14,
    y: canvasH * 0.14,
    width: canvasW * 0.72,
    height: canvasH * 0.62,
  };
}

export function shirtPrintSlot(view: ShirtView): { left: string; top: string; width: string } {
  if (view === "left-shoulder") return { left: "6%", top: "22%", width: "26%" };
  if (view === "right-shoulder") return { left: "68%", top: "22%", width: "26%" };
  if (view === "back") return { left: "29%", top: "34%", width: "42%" };
  return { left: "29%", top: "36%", width: "42%" };
}
