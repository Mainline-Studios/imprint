import { useEffect, useRef, useState } from "react";
import { TEMPLATES, templateThumbColors } from "../templates/catalog";
import { SIZE_PRESETS } from "../templates/presets";
import { useDocumentStore } from "../store/document";
import type { SizePreset } from "../types";

export type CreateFocus = SizePreset["group"];

const FOCUS_TITLE: Record<CreateFocus, string> = {
  custom: "Custom size",
  social: "Social sizes",
  presentation: "Presentation sizes",
  print: "Print sizes",
  site: "Website sizes",
  email: "Email sizes",
};

export function CreateModal({ focus }: { focus?: CreateFocus }) {
  const [customW, setCustomW] = useState(1080);
  const [customH, setCustomH] = useState(1080);
  const customWRef = useRef<HTMLInputElement>(null);

  const presets = focus && focus !== "custom" ? SIZE_PRESETS.filter((p) => p.group === focus) : SIZE_PRESETS;
  const templates = focus && focus !== "custom" ? TEMPLATES.filter((t) => t.category === focus) : TEMPLATES;

  useEffect(() => {
    if (focus !== "custom") return;
    customWRef.current?.focus();
    customWRef.current?.select();
    document.getElementById("create-custom")?.scrollIntoView({ block: "nearest" });
  }, [focus]);

  return (
    <div className="modal-backdrop" onClick={() => useDocumentStore.getState().setCreateOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="create-title">
        <div className="modal-head">
          <h2 id="create-title">{focus ? FOCUS_TITLE[focus] : "Create a design"}</h2>
          <button type="button" className="icon-btn" onClick={() => useDocumentStore.getState().setCreateOpen(false)} aria-label="Close">
            ×
          </button>
        </div>

        <h3 className="modal-label">Sizes</h3>
        <div className="preset-grid">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              className="preset-card"
              onClick={() => void useDocumentStore.getState().createBlank(p.width, p.height, p.name)}
            >
              <span className="preset-frame" style={{ aspectRatio: `${p.width} / ${p.height}` }} />
              <strong>{p.name}</strong>
              <span>
                {p.width} × {p.height}
              </span>
            </button>
          ))}
          <div className={`preset-card custom${focus === "custom" ? " highlight" : ""}`} id="create-custom">
            <strong>Custom</strong>
            <div className="custom-size">
              <input
                ref={customWRef}
                type="number"
                min={64}
                max={8192}
                value={customW}
                onChange={(e) => setCustomW(Number(e.target.value))}
                aria-label="Width"
              />
              <span>×</span>
              <input
                type="number"
                min={64}
                max={8192}
                value={customH}
                onChange={(e) => setCustomH(Number(e.target.value))}
                aria-label="Height"
              />
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                void useDocumentStore.getState().createBlank(
                  Math.max(64, customW || 1080),
                  Math.max(64, customH || 1080),
                  "Custom",
                )
              }
            >
              Create
            </button>
          </div>
        </div>

        {templates.length > 0 && (
          <>
            <h3 className="modal-label">Templates</h3>
            <div className="template-grid">
              {templates.map((t) => {
                const colors = templateThumbColors(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="template-card"
                    onClick={() => void useDocumentStore.getState().createFromTemplate(t.id)}
                  >
                    <span className="template-swatch" style={{ background: colors.bg, color: colors.accent, aspectRatio: `${t.width} / ${t.height}` }}>
                      {t.name}
                    </span>
                    <strong>{t.name}</strong>
                    <span>
                      {t.width} × {t.height}
                      {t.id === "keynote-deck" ? " · 3 pages" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
