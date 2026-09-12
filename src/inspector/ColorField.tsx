import type { ReactNode } from "react";
import { DEFAULT_BRAND, defaultLinearFrom, isLinearFill, solidColor } from "../lib/fill";
import { useDocumentStore } from "../store/document";
import type { Fill, LinearFill } from "../types";

function pickerColors(): string[] {
  const design = useDocumentStore.getState().design;
  const defaults = useDocumentStore.getState().brandDefaults;
  if (design?.brandColors?.length) return design.brandColors;
  if (defaults.length) return defaults;
  return DEFAULT_BRAND;
}

export function ColorInput({
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
  const colors = pickerColors();
  return (
    <div className="color-field">
      <div className="brand-swatches">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            className={c.toLowerCase() === hex.toLowerCase() ? "brand-swatch on" : "brand-swatch"}
            style={{ background: c }}
            title={c}
            onClick={() => {
              onBegin();
              onChange(c);
              onEnd();
            }}
          />
        ))}
      </div>
      <div className="color-input">
        <input type="color" value={hex} onFocus={onBegin} onBlur={onEnd} onChange={(e) => onChange(e.target.value)} />
        <input type="text" value={value} onFocus={onBegin} onBlur={onEnd} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

export function FillEditor({
  value,
  onChange,
}: {
  value: Fill;
  onChange: (fill: Fill) => void;
}) {
  const linear = isLinearFill(value);
  const solid = solidColor(value);
  const gradient: LinearFill = linear ? value : defaultLinearFrom(solid);
  const stops = gradient.stops.slice(0, 3);
  while (stops.length < 2) stops.push({ offset: 1, color: "#f6f1e8" });

  function patchStops(next: LinearFill["stops"]) {
    onChange({ ...gradient, stops: next });
  }

  return (
    <div className="fill-editor">
      <p className="hint">Fade from one color to another, or keep a single color.</p>
      <div className="seg">
        <button type="button" className={linear ? "" : "on"} onClick={() => onChange(solid)}>
          Solid
        </button>
        <button type="button" className={linear ? "on" : ""} onClick={() => onChange(gradient)}>
          Fade
        </button>
      </div>
      {linear ? (
        <>
          <div className="field">
            <span>
              Angle <em>{Math.round(gradient.angle)}°</em>
            </span>
            <input
              type="range"
              min={0}
              max={360}
              value={gradient.angle}
              onPointerDown={() => useDocumentStore.getState().beginHistory()}
              onPointerUp={() => useDocumentStore.getState().endHistory()}
              onChange={(e) => onChange({ ...gradient, angle: Number(e.target.value) })}
            />
          </div>
          {stops.map((stop, i) => (
            <div key={i} className="field">
              <span>{i === 0 ? "From" : i === stops.length - 1 ? "To" : "Middle"}</span>
              <ColorInput
                value={stop.color}
                onBegin={() => useDocumentStore.getState().beginHistory()}
                onChange={(color) => {
                  const next = stops.map((s, j) => (j === i ? { ...s, color } : s));
                  patchStops(next);
                }}
                onEnd={() => useDocumentStore.getState().endHistory()}
              />
            </div>
          ))}
          {stops.length < 3 ? (
            <button
              type="button"
              className="btn-secondary wide"
              onClick={() =>
                patchStops([
                  stops[0],
                  { offset: 0.5, color: "#c4a574" },
                  { offset: 1, color: stops[stops.length - 1]?.color ?? "#f6f1e8" },
                ])
              }
            >
              Add a middle color
            </button>
          ) : (
            <button
              type="button"
              className="btn-secondary wide"
              onClick={() => patchStops([stops[0], { offset: 1, color: stops[stops.length - 1]?.color ?? "#f6f1e8" }])}
            >
              Remove middle color
            </button>
          )}
        </>
      ) : (
        <ColorInput
          value={solid}
          onBegin={() => useDocumentStore.getState().beginHistory()}
          onChange={(v) => onChange(v)}
          onEnd={() => useDocumentStore.getState().endHistory()}
        />
      )}
    </div>
  );
}

export function YourColors({
  colors,
  onChange,
}: {
  colors: string[];
  onChange: (colors: string[]) => void;
}) {
  return (
    <div className="field">
      <span>Your colors</span>
      <div className="brand-swatches edit">
        {colors.map((c) => (
          <span key={c} className="brand-swatch-edit">
            <span className="brand-swatch" style={{ background: c }} title={c} />
            <button type="button" className="brand-remove" aria-label={`Remove ${c}`} onClick={() => onChange(colors.filter((x) => x !== c))}>
              ×
            </button>
          </span>
        ))}
        <label className="brand-add">
          <input
            type="color"
            value="#7a2e2e"
            onChange={(e) => {
              const v = e.target.value;
              if (!colors.some((c) => c.toLowerCase() === v.toLowerCase())) onChange([...colors, v].slice(0, 24));
            }}
          />
          Add
        </label>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <span>{label}</span>
      {children}
    </div>
  );
}
