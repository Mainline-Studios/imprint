import { useEffect, useState, type ReactNode } from "react";
import { ShirtPreview } from "../editor/ShirtPreview";
import { useDocumentStore, currentPage, selectedObjects } from "../store/document";
import { SIZE_PRESETS, isEmailSize, isSiteSize, isTshirtSize } from "../templates/presets";
import { FONT_GROUPS, fontsIn, fontOf, isFontFamily } from "../fonts/catalog";
import { emailFromMailto, hrefKind, mailtoHref, normalizeHrefInput, pageHref, pageIndexFromHref } from "../lib/href";
import { shirtViewOf, shirtViewPhrase } from "../lib/shirt";
import { TextEffectsPanel } from "./TextEffectsPanel";
import type { ButtonObject, CanvasObject, FontWeight, ShapeObject, TextAlign, TextObject } from "../types";

export function Inspector() {
  const design = useDocumentStore((s) => s.design);
  const selectedIds = useDocumentStore((s) => s.selectedIds);
  const grouping = useDocumentStore((s) => s.grouping);
  const pageIndex = useDocumentStore((s) => s.currentPageIndex);

  if (!design) return <aside className="inspector" />;

  const page = currentPage(useDocumentStore.getState());
  const selected = selectedObjects(useDocumentStore.getState());
  const one = selected.length === 1 ? selected[0] : null;
  const tshirt = isTshirtSize(design.width, design.height);
  const shirtView = page ? shirtViewOf(page, pageIndex) : "front";

  return (
    <aside className="inspector">
      {tshirt ? <ShirtPreview /> : null}
      {selectedIds.length === 0 && page && (
        <>
          <h3>Page</h3>
          <Field label="Background">
            <ColorInput
              value={page.background}
              onBegin={() => useDocumentStore.getState().beginHistory()}
              onChange={(v) => useDocumentStore.getState().setBackground(v)}
              onEnd={() => useDocumentStore.getState().endHistory()}
            />
          </Field>
          <Field label="Size">
            <select
              value={SIZE_PRESETS.find((p) => p.width === design.width && p.height === design.height)?.id ?? "custom"}
              onChange={(e) => {
                const preset = SIZE_PRESETS.find((p) => p.id === e.target.value);
                if (preset) useDocumentStore.getState().resizeCanvas(preset.width, preset.height);
              }}
            >
              {SIZE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value="custom">
                Custom {Math.round(design.width)} × {Math.round(design.height)}
              </option>
            </select>
          </Field>
          <p className="hint">
            {Math.round(design.width)} × {Math.round(design.height)} px
          </p>
          {isSiteSize(design.width, design.height) ? (
            <p className="hint">
              This is a website page. Add a Button from Elements, then Export → Open site to preview, or download the
              HTML.
            </p>
          ) : isEmailSize(design.width, design.height) ? (
            <p className="hint">
              This is a newsletter. Add a Button, then Export → Open site to preview, or download the HTML to send later.
            </p>
          ) : tshirt ? (
            <p className="hint">
              This is the {shirtViewPhrase(shirtView)} print. Switch views in the page strip below.
            </p>
          ) : null}
        </>
      )}

      {selectedIds.length > 1 && (
        <>
          <h3>{selectedIds.length} selected</h3>
          <LayerButtons />
          <AlignButtons />
        </>
      )}

      {one?.type === "text" && <TextFields obj={one} grouping={grouping} />}
      {one?.type === "shape" && <ShapeFields obj={one} />}
      {one?.type === "image" && <ImageFields obj={one} />}
      {one?.type === "button" && <ButtonFields obj={one} />}
      {one && <PositionFields obj={one} />}
      {one && (
        <>
          <LayerButtons />
          <AlignButtons />
        </>
      )}
    </aside>
  );
}

function TextFields({ obj, grouping }: { obj: TextObject; grouping: boolean }) {
  useEffect(() => {
    return () => {
      useDocumentStore.getState().endHistory();
    };
  }, [obj.id]);

  return (
    <>
      <h3>Text</h3>
      <Field label="Content">
        <textarea
          rows={3}
          value={obj.text}
          onChange={(e) =>
            useDocumentStore.getState().updateObject(obj.id, { text: e.target.value }, { record: !grouping })
          }
          onFocus={() => useDocumentStore.getState().beginHistory()}
          onBlur={() => useDocumentStore.getState().endHistory()}
        />
      </Field>
      <Field label="Font">
        <select
          className="font-select"
          value={isFontFamily(obj.fontFamily) ? obj.fontFamily : "Inter"}
          style={{ fontFamily: fontOf(obj.fontFamily) }}
          onChange={(e) => {
            const next = e.target.value;
            if (isFontFamily(next)) {
              useDocumentStore.getState().updateObject(obj.id, { fontFamily: next });
            }
          }}
        >
          {FONT_GROUPS.map((group) => (
            <optgroup key={group.category} label={group.label}>
              {fontsIn(group.category).map((font) => (
                <option key={font.family} value={font.family} style={{ fontFamily: fontOf(font.family) }}>
                  {font.family}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>
      <div className="field-row">
        <Field label="Size">
          <input
            type="number"
            min={8}
            max={400}
            value={Math.round(obj.fontSize)}
            onChange={(e) =>
              useDocumentStore.getState().updateObject(obj.id, { fontSize: Number(e.target.value) || obj.fontSize })
            }
          />
        </Field>
        <Field label="Weight">
          <select
            value={obj.fontWeight}
            onChange={(e) =>
              useDocumentStore.getState().updateObject(obj.id, {
                fontWeight: Number(e.target.value) as FontWeight,
              })
            }
          >
            <option value={400}>Regular</option>
            <option value={500}>Medium</option>
            <option value={600}>Semibold</option>
            <option value={700}>Bold</option>
          </select>
        </Field>
      </div>
      <Field label="Align">
        <div className="seg">
          {(["left", "center", "right"] as TextAlign[]).map((a) => (
            <button
              key={a}
              type="button"
              className={obj.align === a ? "on" : ""}
              onClick={() => useDocumentStore.getState().updateObject(obj.id, { align: a })}
            >
              {a}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Color">
        <ColorInput
          value={obj.fill}
          onBegin={() => useDocumentStore.getState().beginHistory()}
          onChange={(v) => useDocumentStore.getState().updateObject(obj.id, { fill: v }, { record: false })}
          onEnd={() => useDocumentStore.getState().endHistory()}
        />
      </Field>
      <OpacityField obj={obj} />
      <TextEffectsPanel obj={obj} />
    </>
  );
}

function ShapeFields({ obj }: { obj: ShapeObject }) {
  return (
    <>
      <h3>Shape</h3>
      <Field label="Fill">
        <ColorInput
          value={obj.fill}
          onBegin={() => useDocumentStore.getState().beginHistory()}
          onChange={(v) => useDocumentStore.getState().updateObject(obj.id, { fill: v }, { record: false })}
          onEnd={() => useDocumentStore.getState().endHistory()}
        />
      </Field>
      <Field label="Stroke">
        <ColorInput
          value={obj.stroke === "transparent" ? "#1a1614" : obj.stroke}
          onBegin={() => useDocumentStore.getState().beginHistory()}
          onChange={(v) =>
            useDocumentStore.getState().updateObject(obj.id, { stroke: v, strokeWidth: Math.max(obj.strokeWidth, 1) }, { record: false })
          }
          onEnd={() => useDocumentStore.getState().endHistory()}
        />
      </Field>
      <Field label="Stroke width">
        <input
          type="number"
          min={0}
          max={40}
          value={obj.strokeWidth}
          onChange={(e) =>
            useDocumentStore.getState().updateObject(obj.id, { strokeWidth: Number(e.target.value) || 0 })
          }
        />
      </Field>
      {obj.shape === "rect" && (
        <Field label="Corners">
          <input
            type="range"
            min={0}
            max={Math.round(Math.min(obj.width, obj.height) / 2)}
            value={obj.cornerRadius}
            onPointerDown={() => useDocumentStore.getState().beginHistory()}
            onPointerUp={() => useDocumentStore.getState().endHistory()}
            onChange={(e) =>
              useDocumentStore.getState().updateObject(obj.id, { cornerRadius: Number(e.target.value) }, { record: false })
            }
          />
        </Field>
      )}
      <OpacityField obj={obj} />
    </>
  );
}

function ImageFields({ obj }: { obj: CanvasObject }) {
  return (
    <>
      <h3>Image</h3>
      <OpacityField obj={obj} />
    </>
  );
}

function ButtonFields({ obj }: { obj: ButtonObject }) {
  const design = useDocumentStore((s) => s.design);
  const pageCount = design?.pages.length ?? 1;
  const pageIdx = pageIndexFromHref(obj.href);
  const kind = hrefKind(obj.href);
  const storedUrl =
    kind === "page" ? "" : kind === "mail" ? emailFromMailto(obj.href) : obj.href === "https://" ? "" : obj.href;
  const [urlDraft, setUrlDraft] = useState(storedUrl);

  useEffect(() => {
    setUrlDraft(storedUrl);
  }, [obj.id, storedUrl]);

  useEffect(() => {
    return () => {
      useDocumentStore.getState().endHistory();
    };
  }, [obj.id]);

  return (
    <>
      <h3>Button</h3>
      <Field label="Button text">
        <input
          type="text"
          value={obj.text}
          onChange={(e) =>
            useDocumentStore.getState().updateObject(obj.id, { text: e.target.value }, { record: false })
          }
          onFocus={() => useDocumentStore.getState().beginHistory()}
          onBlur={() => useDocumentStore.getState().endHistory()}
        />
      </Field>
      <Field label="Goes to">
        <div className="seg wrap">
          <button
            type="button"
            className={kind === "web" || kind === "empty" ? "on" : ""}
            onClick={() => {
              if (kind === "web" || kind === "empty") return;
              useDocumentStore.getState().updateObject(obj.id, { href: "https://" });
            }}
          >
            A website
          </button>
          <button
            type="button"
            className={kind === "page" ? "on" : ""}
            onClick={() => useDocumentStore.getState().updateObject(obj.id, { href: pageHref(1) })}
          >
            Another page
          </button>
          <button
            type="button"
            className={kind === "mail" ? "on" : ""}
            onClick={() => {
              if (kind === "mail") return;
              useDocumentStore.getState().updateObject(obj.id, { href: "mailto:" });
            }}
          >
            Email address
          </button>
        </div>
      </Field>
      {kind === "page" ? (
        <Field label="Which page">
          <select
            value={String((pageIdx ?? 0) + 1)}
            onChange={(e) =>
              useDocumentStore.getState().updateObject(obj.id, { href: pageHref(Number(e.target.value)) })
            }
          >
            {Array.from({ length: pageCount }, (_, i) => (
              <option key={i} value={i + 1}>
                Page {i + 1}
              </option>
            ))}
          </select>
        </Field>
      ) : kind === "mail" ? (
        <Field label="Email address">
          <input
            type="text"
            value={urlDraft}
            placeholder="you@studio.com"
            onChange={(e) => {
              const next = e.target.value.replace(/^mailto:/i, "");
              setUrlDraft(next);
              useDocumentStore.getState().updateObject(obj.id, { href: mailtoHref(next) }, { record: false });
            }}
            onFocus={() => useDocumentStore.getState().beginHistory()}
            onBlur={() => {
              const href = mailtoHref(urlDraft);
              setUrlDraft(emailFromMailto(href));
              useDocumentStore.getState().updateObject(obj.id, { href }, { record: false });
              useDocumentStore.getState().endHistory();
            }}
          />
        </Field>
      ) : (
        <Field label="Web address">
          <input
            type="text"
            value={urlDraft}
            placeholder="your-site.com"
            onChange={(e) => {
              const next = e.target.value;
              setUrlDraft(next);
              useDocumentStore.getState().updateObject(obj.id, { href: next }, { record: false });
            }}
            onFocus={() => useDocumentStore.getState().beginHistory()}
            onBlur={() => {
              const href = normalizeHrefInput(urlDraft);
              setUrlDraft(href === "https://" ? "" : href.startsWith("mailto:") ? emailFromMailto(href) : href);
              useDocumentStore.getState().updateObject(obj.id, { href }, { record: false });
              useDocumentStore.getState().endHistory();
            }}
          />
        </Field>
      )}
      <p className="hint">
        {kind === "mail"
          ? "Opens their mail app. Export → Open site to try it, or download the HTML."
          : "Export → Open site to try the button, or download the HTML so the link works."}
      </p>
      <Field label="Fill">
        <ColorInput
          value={obj.fill}
          onBegin={() => useDocumentStore.getState().beginHistory()}
          onChange={(v) => useDocumentStore.getState().updateObject(obj.id, { fill: v }, { record: false })}
          onEnd={() => useDocumentStore.getState().endHistory()}
        />
      </Field>
      <Field label="Text color">
        <ColorInput
          value={obj.textFill}
          onBegin={() => useDocumentStore.getState().beginHistory()}
          onChange={(v) => useDocumentStore.getState().updateObject(obj.id, { textFill: v }, { record: false })}
          onEnd={() => useDocumentStore.getState().endHistory()}
        />
      </Field>
      <Field label="Corners">
        <input
          type="range"
          min={0}
          max={Math.round(Math.min(obj.width, obj.height) / 2)}
          value={obj.cornerRadius}
          onPointerDown={() => useDocumentStore.getState().beginHistory()}
          onPointerUp={() => useDocumentStore.getState().endHistory()}
          onChange={(e) =>
            useDocumentStore.getState().updateObject(obj.id, { cornerRadius: Number(e.target.value) }, { record: false })
          }
        />
      </Field>
      <OpacityField obj={obj} />
    </>
  );
}

function PositionFields({ obj }: { obj: CanvasObject }) {
  const h = obj.type === "text" ? undefined : obj.height;
  return (
    <>
      <h3>Position</h3>
      <div className="field-row">
        <NumField label="X" value={obj.x} onChange={(x) => useDocumentStore.getState().updateObject(obj.id, { x })} />
        <NumField label="Y" value={obj.y} onChange={(y) => useDocumentStore.getState().updateObject(obj.id, { y })} />
      </div>
      <div className="field-row">
        <NumField
          label="W"
          value={obj.width}
          onChange={(width) => useDocumentStore.getState().updateObject(obj.id, { width: Math.max(8, width) })}
        />
        {h !== undefined && (
          <NumField
            label="H"
            value={h}
            onChange={(height) => useDocumentStore.getState().updateObject(obj.id, { height: Math.max(8, height) })}
          />
        )}
      </div>
      <NumField
        label="Rotate"
        value={obj.rotation}
        onChange={(rotation) => useDocumentStore.getState().updateObject(obj.id, { rotation })}
      />
    </>
  );
}

function OpacityField({ obj }: { obj: CanvasObject }) {
  return (
    <Field label="Opacity">
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(obj.opacity * 100)}
        onPointerDown={() => useDocumentStore.getState().beginHistory()}
        onPointerUp={() => useDocumentStore.getState().endHistory()}
        onChange={(e) =>
          useDocumentStore.getState().updateObject(obj.id, { opacity: Number(e.target.value) / 100 }, { record: false })
        }
      />
    </Field>
  );
}

function LayerButtons() {
  const s = () => useDocumentStore.getState();
  return (
    <Field label="Layer">
      <div className="seg wrap">
        <button type="button" onClick={() => s().bringForward()}>
          Forward
        </button>
        <button type="button" onClick={() => s().sendBackward()}>
          Backward
        </button>
        <button type="button" onClick={() => s().bringToFront()}>
          Front
        </button>
        <button type="button" onClick={() => s().sendToBack()}>
          Back
        </button>
      </div>
    </Field>
  );
}

function AlignButtons() {
  const s = () => useDocumentStore.getState();
  return (
    <Field label="Align to page">
      <div className="seg wrap">
        <button type="button" onClick={() => s().alignOnPage("left")}>
          Left
        </button>
        <button type="button" onClick={() => s().alignOnPage("center")}>
          Center
        </button>
        <button type="button" onClick={() => s().alignOnPage("right")}>
          Right
        </button>
        <button type="button" onClick={() => s().alignOnPage("top")}>
          Top
        </button>
        <button type="button" onClick={() => s().alignOnPage("middle")}>
          Middle
        </button>
        <button type="button" onClick={() => s().alignOnPage("bottom")}>
          Bottom
        </button>
      </div>
    </Field>
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

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
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
      <input
        type="text"
        value={value}
        onFocus={onBegin}
        onBlur={onEnd}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
