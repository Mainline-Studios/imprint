import type { ReactNode } from "react";
import { MiniPreview } from "../canvas/MiniPreview";
import {
  DEFAULT_SHIRT_COLOR,
  SHIRT_SWATCHES,
  SHIRT_VIEW_LABELS,
  isLightColor,
  shirtPrintSlot,
  shirtViewOf,
} from "../lib/shirt";
import { useDocumentStore } from "../store/document";

const FRONT_BODY =
  "M72 50 L20 76 L38 114 L54 104 L54 214 C54 226 74 234 100 234 C126 234 146 226 146 214 L146 104 L162 114 L180 76 L128 50 C124 62 112 74 100 74 C88 74 76 62 72 50 Z";
const BACK_BODY =
  "M74 46 L20 76 L38 114 L54 104 L54 214 C54 226 74 234 100 234 C126 234 146 226 146 214 L146 104 L162 114 L180 76 L126 46 C118 56 82 56 74 46 Z";
const FRONT_COLLAR = "M76 52 C84 70 116 70 124 52 C118 64 82 64 76 52 Z";
const BACK_COLLAR = "M78 48 C88 58 112 58 122 48 C114 54 86 54 78 48 Z";

export function ShirtPreview() {
  const design = useDocumentStore((s) => s.design);
  const pageIndex = useDocumentStore((s) => s.currentPageIndex);
  if (!design) return null;

  const page = design.pages[pageIndex];
  if (!page) return null;

  const view = shirtViewOf(page, pageIndex);
  const color = design.shirt?.color ?? DEFAULT_SHIRT_COLOR;
  const light = isLightColor(color);
  const back = view === "back";
  const slot = shirtPrintSlot(view);
  const body = back ? BACK_BODY : FRONT_BODY;
  const collar = back ? BACK_COLLAR : FRONT_COLLAR;
  const zoom =
    view === "left-shoulder" ? "shirt-stage zoom-left" : view === "right-shoulder" ? "shirt-stage zoom-right" : "shirt-stage";

  return (
    <div className="shirt-preview">
      <h3>Shirt preview</h3>
      <div className={zoom}>
        <div className="shirt-stage-inner">
          <svg viewBox="0 0 200 240" className="shirt-svg" aria-hidden>
            <path
              d={body}
              fill={color}
              stroke={light ? "rgba(26,22,20,0.28)" : "rgba(0,0,0,0.45)"}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path d={body} fill={light ? "rgba(26,22,20,0.04)" : "rgba(0,0,0,0.12)"} />
            <path
              d="M54 104 L54 214 C54 226 74 234 100 234 C126 234 146 226 146 214 L146 104"
              fill="none"
              stroke={light ? "rgba(26,22,20,0.08)" : "rgba(255,255,255,0.06)"}
              strokeWidth="10"
            />
            <path d={collar} fill={light ? "rgba(26,22,20,0.1)" : "rgba(0,0,0,0.22)"} />
            <path
              d="M20 76 L38 114 L54 104"
              fill="none"
              stroke={light ? "rgba(26,22,20,0.12)" : "rgba(0,0,0,0.25)"}
              strokeWidth="1"
            />
            <path
              d="M180 76 L162 114 L146 104"
              fill="none"
              stroke={light ? "rgba(26,22,20,0.12)" : "rgba(0,0,0,0.25)"}
              strokeWidth="1"
            />
          </svg>
          <div
            className="shirt-print"
            style={{
              left: slot.left,
              top: slot.top,
              width: slot.width,
              aspectRatio: `${design.width} / ${design.height}`,
            }}
          >
            <MiniPreview
              className="shirt-print-mini"
              width={design.width}
              height={design.height}
              background="transparent"
              objects={page.objects}
            />
          </div>
        </div>
      </div>
      <p className="hint shirt-preview-caption">{SHIRT_VIEW_LABELS[view]} preview</p>
      <Field label="Shirt color">
        <div className="shirt-swatches" role="list">
          {SHIRT_SWATCHES.map((swatch) => (
            <button
              key={swatch.color}
              type="button"
              className={
                color.toLowerCase() === swatch.color
                  ? `shirt-swatch on${isLightColor(swatch.color) ? " light" : ""}`
                  : `shirt-swatch${isLightColor(swatch.color) ? " light" : ""}`
              }
              style={{ background: swatch.color }}
              title={swatch.name}
              aria-label={swatch.name}
              onClick={() => useDocumentStore.getState().setShirtColor(swatch.color)}
            />
          ))}
        </div>
        <ColorField
          value={color}
          onBegin={() => useDocumentStore.getState().beginHistory()}
          onChange={(v) => useDocumentStore.getState().setShirtColor(v, { record: false })}
          onEnd={() => useDocumentStore.getState().endHistory()}
        />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <span>{label}</span>
      {children}
    </div>
  );
}

function ColorField({
  value,
  onChange,
  onBegin,
  onEnd,
}: {
  value: string;
  onChange: (v: string) => void;
  onBegin: () => void;
  onEnd: () => void;
}) {
  const hex = value.startsWith("#") && value.length >= 7 ? value.slice(0, 7) : "#1a1614";
  return (
    <div className="color-input">
      <input type="color" value={hex} onFocus={onBegin} onBlur={onEnd} onChange={(e) => onChange(e.target.value)} />
      <input type="text" value={value} onFocus={onBegin} onBlur={onEnd} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
