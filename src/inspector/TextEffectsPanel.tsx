import type { CSSProperties, ReactNode } from "react";
import { CLEAR_EFFECT_PATCH, EFFECT_TILES, textEffectOf } from "../canvas/textEffects";
import { useDocumentStore } from "../store/document";
import {
  curveOf,
  letterSpacingOf,
  lineHeightOf,
  strokeWidthOf,
  textTransformOf,
} from "../text/effects";
import type { TextEffectId, TextObject, TextTransform } from "../types";

const LETTER_CASES: { id: TextTransform; label: string }[] = [
  { id: "none", label: "None" },
  { id: "uppercase", label: "Upper" },
  { id: "small-caps", label: "Small caps" },
];

function patchText(id: string, patch: Partial<TextObject>, record = true) {
  useDocumentStore.getState().updateObject(id, patch, { record });
}

export function TextEffectsPanel({ obj }: { obj: TextObject }) {
  const effect = textEffectOf(obj);
  const curve = curveOf(obj);
  const curved = Math.abs(curve) >= 1;
  const fill = obj.fill && obj.fill !== "transparent" ? obj.fill : "#7a2e2e";
  const custom = effect === "none";
  const s = () => useDocumentStore.getState();
  const swatchStyle = { ["--fx"]: fill } as CSSProperties;

  function selectEffect(id: TextEffectId) {
    if (id === "none") patchText(obj.id, CLEAR_EFFECT_PATCH);
    else patchText(obj.id, { effect: id });
  }

  return (
    <>
      <h3>Effects</h3>
      <div className="effect-grid">
        {EFFECT_TILES.map((tile) => (
          <button
            key={tile.id}
            type="button"
            className={effect === tile.id ? "effect-tile on" : "effect-tile"}
            aria-label={tile.label}
            aria-pressed={effect === tile.id}
            onClick={() => selectEffect(tile.id)}
          >
            <span className={`effect-swatch fx-${tile.id}`} style={swatchStyle}>
              <span className="effect-ag">Ag</span>
            </span>
            <span className="effect-label">{tile.label}</span>
          </button>
        ))}
      </div>
      <h3>Shape</h3>
      <div className="effect-grid">
        <button
          type="button"
          className={curved ? "effect-tile on" : "effect-tile"}
          aria-label="Curve"
          aria-pressed={curved}
          onClick={() => patchText(obj.id, { curve: curved ? 0 : 50 })}
        >
          <span className="effect-swatch fx-curve" style={swatchStyle}>
            <CurveMark color={fill} />
          </span>
          <span className="effect-label">Curve</span>
        </button>
      </div>
      <RangeField
        label="Curve"
        value={curve}
        min={-100}
        max={100}
        onChange={(next) => patchText(obj.id, { curve: next }, false)}
      />
      {custom && (
        <>
          <div className="field-row">
            <Field label="Outline">
              <ColorInput
                value={obj.stroke ?? obj.fill}
                onBegin={() => s().beginHistory()}
                onChange={(v) =>
                  patchText(obj.id, { stroke: v, strokeWidth: Math.max(strokeWidthOf(obj), 1) }, false)
                }
                onEnd={() => s().endHistory()}
              />
            </Field>
            <Field label="Width" value={String(strokeWidthOf(obj))}>
              <input
                type="number"
                min={0}
                max={40}
                value={strokeWidthOf(obj)}
                onChange={(e) => patchText(obj.id, { strokeWidth: Number(e.target.value) || 0 })}
              />
            </Field>
          </div>
          <div className="field-row">
            <Field label="Glow">
              <ColorInput
                value={obj.shadowColor ?? "#22f0ff"}
                onBegin={() => s().beginHistory()}
                onChange={(v) =>
                  patchText(
                    obj.id,
                    {
                      shadowColor: v,
                      shadowOpacity: obj.shadowOpacity || 0.9,
                      shadowBlur: (obj.shadowBlur ?? 0) > 0 ? obj.shadowBlur : 16,
                    },
                    false,
                  )
                }
                onEnd={() => s().endHistory()}
              />
            </Field>
            <RangeField
              label="Size"
              value={obj.shadowBlur ?? 0}
              min={0}
              max={80}
              onChange={(shadowBlur) =>
                patchText(obj.id, { shadowBlur, shadowOpacity: obj.shadowOpacity || 0.9 }, false)
              }
            />
          </div>
          <div className="field-row">
            <RangeField
              label="Shadow X"
              value={obj.shadowOffsetX ?? 0}
              min={-40}
              max={40}
              onChange={(shadowOffsetX) => patchText(obj.id, { shadowOffsetX }, false)}
            />
            <RangeField
              label="Shadow Y"
              value={obj.shadowOffsetY ?? 0}
              min={-40}
              max={40}
              onChange={(shadowOffsetY) => patchText(obj.id, { shadowOffsetY }, false)}
            />
          </div>
        </>
      )}
      <div className="field-row">
        <RangeField
          label="Spacing"
          value={letterSpacingOf(obj)}
          min={-20}
          max={60}
          onChange={(letterSpacing) => patchText(obj.id, { letterSpacing }, false)}
        />
        <RangeField
          label="Line height"
          value={lineHeightOf(obj)}
          min={0.8}
          max={2.5}
          step={0.05}
          display={lineHeightOf(obj).toFixed(2)}
          onChange={(lineHeight) => patchText(obj.id, { lineHeight }, false)}
        />
      </div>
      <Field label="Letters">
        <div className="seg">
          {LETTER_CASES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={textTransformOf(obj) === c.id ? "on" : ""}
              onClick={() => patchText(obj.id, { textTransform: c.id })}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Field>
    </>
  );
}

function CurveMark({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 72 56" className="effect-curve-svg" aria-hidden>
      <defs>
        <path id="imprint-effect-curve" d="M 8 40 Q 36 10 64 40" fill="none" />
      </defs>
      <path d="M 8 40 Q 36 10 64 40" fill="none" stroke={color} strokeWidth="1.2" opacity="0.35" />
      <text fill={color} fontSize="14" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
        <textPath href="#imprint-effect-curve" startOffset="50%" textAnchor="middle">
          ABCD
        </textPath>
      </text>
    </svg>
  );
}

function Field({ label, children, value }: { label: string; children: ReactNode; value?: string }) {
  return (
    <div className="field">
      <span>
        {label}
        {value != null ? <em>{value}</em> : null}
      </span>
      {children}
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  display?: string;
  onChange: (n: number) => void;
}) {
  const shown = display ?? String(Math.round(value));
  return (
    <Field label={label} value={shown}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={() => useDocumentStore.getState().beginHistory()}
        onPointerUp={() => useDocumentStore.getState().endHistory()}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

function ColorInput({
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
