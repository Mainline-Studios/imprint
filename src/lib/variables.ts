export const POINTS_TOKEN = "{{points}}";
export const POINTS_LABEL = "Points";

export type TextPart = { kind: "text"; text: string } | { kind: "var"; name: "points" };

export function hasPointsToken(text: string): boolean {
  return text.includes(POINTS_TOKEN);
}

export function splitVariables(text: string): TextPart[] {
  if (!text) return [];
  const parts: TextPart[] = [];
  const re = /\{\{points\}\}/g;
  let last = 0;
  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ kind: "text", text: text.slice(last, index) });
    parts.push({ kind: "var", name: "points" });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function variableEditorHtml(text: string): string {
  if (!text) return "";
  return splitVariables(text)
    .map((part) => {
      if (part.kind === "var") {
        return `<span class="var-chip" contenteditable="false" data-var="points">${POINTS_LABEL}</span>`;
      }
      return escapeHtml(part.text).replace(/\n/g, "<br>");
    })
    .join("");
}

export function serializeVariableEditor(root: HTMLElement): string {
  let out = "";
  const walk = (node: Node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.textContent?.replace(/\u00a0/g, " ") ?? "";
        return;
      }
      if (!(child instanceof HTMLElement)) return;
      if (child.dataset.var === "points") {
        out += POINTS_TOKEN;
        return;
      }
      if (child.tagName === "BR") {
        out += "\n";
        return;
      }
      const block = child.tagName === "DIV" || child.tagName === "P";
      if (block && out.length > 0 && !out.endsWith("\n")) out += "\n";
      walk(child);
    });
  };
  walk(root);
  return out;
}

export type PlacedVariable =
  | { kind: "text"; text: string; x: number; y: number }
  | { kind: "var"; x: number; y: number; w: number; h: number };

export function layoutVariableText(
  text: string,
  boxWidth: number,
  fontSize: number,
  lineHeight: number,
  align: "left" | "center" | "right",
  letterSpacing: number,
  measure: (sample: string) => number,
): PlacedVariable[] {
  const lh = fontSize * lineHeight;
  const chipPad = fontSize * 0.42;
  const chipH = fontSize * 1.08;
  const lines: { items: { kind: "text" | "var"; text: string; w: number }[]; width: number }[] = [];
  let items: { kind: "text" | "var"; text: string; w: number }[] = [];
  let lineW = 0;

  const widthOf = (sample: string) => {
    if (!sample) return 0;
    return measure(sample) + letterSpacing * Math.max(0, sample.length - 1);
  };

  const pushLine = () => {
    lines.push({ items, width: lineW });
    items = [];
    lineW = 0;
  };

  const sourceLines = text.split("\n");
  sourceLines.forEach((line, lineIndex) => {
    for (const part of splitVariables(line)) {
      if (part.kind === "var") {
        const w = widthOf(POINTS_LABEL) + chipPad * 2;
        if (lineW > 0 && lineW + w > boxWidth) pushLine();
        items.push({ kind: "var", text: POINTS_LABEL, w });
        lineW += w;
        continue;
      }
      const words = part.text.split(/(\s+)/);
      for (const word of words) {
        if (!word) continue;
        const w = widthOf(word);
        if (lineW > 0 && word.trim() && lineW + w > boxWidth) pushLine();
        items.push({ kind: "text", text: word, w });
        lineW += w;
      }
    }
    if (lineIndex < sourceLines.length - 1) pushLine();
  });
  if (items.length || lines.length === 0) pushLine();

  const placed: PlacedVariable[] = [];
  lines.forEach((line, index) => {
    const y = index * lh;
    let x = 0;
    if (align === "center") x = Math.max(0, (boxWidth - line.width) / 2);
    else if (align === "right") x = Math.max(0, boxWidth - line.width);
    for (const item of line.items) {
      if (item.kind === "var") {
        placed.push({ kind: "var", x, y: y + Math.max(0, (lh - chipH) / 2), w: item.w, h: chipH });
      } else if (item.text) {
        placed.push({ kind: "text", text: item.text, x, y });
      }
      x += item.w;
    }
  });
  return placed;
}

let measureCtx: CanvasRenderingContext2D | null = null;

export function measureTextWidth(text: string, fontSize: number, fontFamily: string, fontWeight: number): number {
  if (!text) return 0;
  if (typeof document === "undefined") return text.length * fontSize * 0.5;
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * fontSize * 0.5;
  measureCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const width = measureCtx.measureText(text).width;
  return width > 0 ? width : fontSize * 0.3;
}
