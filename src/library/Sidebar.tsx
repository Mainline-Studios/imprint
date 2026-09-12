import { useRef } from "react";
import { FONT_CATALOG, FONT_GROUPS, fontOf } from "../fonts/catalog";
import { TEMPLATES, templateThumbColors } from "../templates/catalog";
import { useDocumentStore } from "../store/document";
import type { ShapeKind, SidebarTab } from "../types";
import { LayersPanel } from "./LayersPanel";
import { STICKERS } from "./stickers";

const TABS: { id: SidebarTab; label: string }[] = [
  { id: "templates", label: "Templates" },
  { id: "elements", label: "Elements" },
  { id: "text", label: "Text" },
  { id: "stickers", label: "Stickers" },
  { id: "uploads", label: "Uploads" },
  { id: "layers", label: "Layers" },
];

export function Sidebar() {
  const tab = useDocumentStore((s) => s.sidebarTab);
  const assets = useDocumentStore((s) => s.assets);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <aside className="sidebar">
      <nav className="side-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? "side-tab on" : "side-tab"}
            onClick={() => useDocumentStore.getState().setSidebarTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="side-body">
        {tab === "templates" && (
          <div className="side-list">
            {TEMPLATES.map((t) => {
              const colors = templateThumbColors(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  className="side-template"
                  onClick={() => useDocumentStore.getState().applyTemplateToPage(t.id)}
                >
                  <span className="template-swatch small" style={{ background: colors.bg }} />
                  <span>
                    {t.name}
                    <small>
                      {t.width} × {t.height}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {tab === "elements" && (
          <>
            <p className="hint">Need a link? Add a Button, type a website or email on the right, then export as Webpage (HTML).</p>
            <div className="add-grid">
              <button
                type="button"
                className="add-tile"
                draggable
                onDragStart={(e) => e.dataTransfer.setData("application/imprint", JSON.stringify({ kind: "button" }))}
                onClick={() => useDocumentStore.getState().addAt({ kind: "button" })}
              >
                <span className="shape-icon button" />
                Button
              </button>
              {(["rect", "ellipse", "triangle", "line"] as ShapeKind[]).map((shape) => (
                <button
                  key={shape}
                  type="button"
                  className="add-tile"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("application/imprint", JSON.stringify({ kind: "shape", shape }))}
                  onClick={() => useDocumentStore.getState().addAt({ kind: "shape", shape })}
                >
                  <span className={`shape-icon ${shape}`} />
                  {labelShape(shape)}
                </button>
              ))}
            </div>
          </>
        )}

        {tab === "stickers" && (
          <>
            <p className="hint">Ink marks you can stamp on the page. Drag one onto the canvas.</p>
            <div className="sticker-grid">
              {STICKERS.map((sticker) => (
                <button
                  key={sticker.id}
                  type="button"
                  className="sticker-tile"
                  title={sticker.name}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("application/imprint", JSON.stringify({ kind: "sticker", sticker: sticker.id }))
                  }
                  onClick={() => useDocumentStore.getState().addAt({ kind: "sticker", sticker: sticker.id })}
                >
                  <svg viewBox={`0 0 ${sticker.view} ${sticker.view}`} aria-hidden>
                    <path d={sticker.path} fill="#7a2e2e" stroke="#7a2e2e" strokeWidth="0.6" />
                  </svg>
                  <span>{sticker.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {tab === "text" && (
          <div className="text-adds">
            {(
              [
                ["heading", "Add a heading", "Playfair Display", 28],
                ["subheading", "Add a subheading", "Inter", 18],
                ["body", "Add a little body text", "Inter", 14],
              ] as const
            ).map(([variant, label, family, size]) => (
              <button
                key={variant}
                type="button"
                className="text-add"
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData("application/imprint", JSON.stringify({ kind: "text", variant }))
                }
                onClick={() => useDocumentStore.getState().addAt({ kind: "text", variant })}
                style={{ fontFamily: family, fontSize: size }}
              >
                {label}
              </button>
            ))}
            {FONT_GROUPS.map((group) => (
              <div key={group.category} className="font-group">
                <h3>{group.label}</h3>
                {FONT_CATALOG.filter((font) => font.category === group.category).map((font) => (
                  <button
                    key={font.family}
                    type="button"
                    className="font-tile"
                    style={{ fontFamily: fontOf(font.family) }}
                    onClick={() =>
                      useDocumentStore.getState().addAt({
                        kind: "text",
                        variant: font.category === "script" || font.category === "display" ? "heading" : "body",
                        fontFamily: font.family,
                      })
                    }
                  >
                    {font.family}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab === "uploads" && (
          <div className="uploads">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void useDocumentStore.getState().addImageFile(file);
                e.target.value = "";
              }}
            />
            <button type="button" className="btn-secondary wide" onClick={() => inputRef.current?.click()}>
              Upload image
            </button>
            <p className="hint">Images stay on this device. Signed in, they also save to your account. Drag a file onto the page to place it.</p>
            {assets.length > 0 && (
              <div className="asset-list">
                {assets.slice(0, 24).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="asset-chip"
                    onClick={() => {
                      void useDocumentStore.getState().placeAsset(a.id);
                    }}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "layers" && <LayersPanel />}
      </div>
    </aside>
  );
}

function labelShape(shape: ShapeKind): string {
  if (shape === "rect") return "Rectangle";
  if (shape === "ellipse") return "Ellipse";
  if (shape === "triangle") return "Triangle";
  return "Line";
}
