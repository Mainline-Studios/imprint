import { useEffect, useMemo, useRef, useState } from "react";
import { MiniPreview } from "../canvas/MiniPreview";
import { useDocumentStore } from "../store/document";
import { presetLabel } from "../templates/presets";
import type { Design } from "../types";

export function relativeEdited(ts: number): string {
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 45) return "Edited just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `Edited ${min} m.`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `Edited ${hr} hr.`;
  const day = Math.round(hr / 24);
  if (day < 30) return `Edited ${day} da.`;
  const mo = Math.round(day / 30);
  return `Edited ${mo} month${mo === 1 ? "" : "s"}.`;
}

export function DesignCard({ design, piles }: { design: Design; piles: string[] }) {
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const page = design.pages[0];
  const assets = useDocumentStore((s) => s.assets);
  const needed = useMemo(() => {
    const ids = new Set<string>();
    for (const p of design.pages) {
      for (const o of p.objects) if (o.type === "image") ids.add(o.assetId);
    }
    return [...ids];
  }, [design]);
  const neededKey = needed.join("\0");
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = neededKey ? neededKey.split("\0") : [];
    const next: Record<string, string> = {};
    for (const id of ids) {
      const rec = assets.find((a) => a.id === id);
      if (rec) next[id] = URL.createObjectURL(rec.blob);
    }
    setUrls(next);
    return () => {
      for (const u of Object.values(next)) URL.revokeObjectURL(u);
    };
  }, [assets, neededKey]);

  useEffect(() => {
    if (!menu) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setMenu(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  return (
    <article className="design-card">
      <button
        type="button"
        className="design-thumb"
        onClick={() => void useDocumentStore.getState().openDesign(design.id)}
      >
        {page && (
          <MiniPreview
            width={design.width}
            height={design.height}
            background={page.background}
            objects={page.objects}
            assetSrc={(id) => urls[id]}
          />
        )}
      </button>
      <div className="design-meta">
        {renaming ? (
          <input
            className="rename-input"
            defaultValue={design.name}
            autoFocus
            onBlur={(e) => {
              const name = e.target.value.trim() || "Untitled";
              void useDocumentStore.getState().renameListed(design.id, name);
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setRenaming(false);
            }}
          />
        ) : (
          <button type="button" className="design-name" onClick={() => void useDocumentStore.getState().openDesign(design.id)}>
            {design.name}
          </button>
        )}
        <div className="design-sub">
          <span>
            {presetLabel(design.width, design.height)} · {relativeEdited(design.updatedAt)}
          </span>
          <div className="card-menu-wrap" ref={wrapRef}>
            <button type="button" className="icon-btn" aria-label="Design menu" onClick={() => setMenu((v) => !v)}>
              ···
            </button>
            {menu && (
              <div className="menu" role="menu">
                <button
                  type="button"
                  onClick={() => {
                    setRenaming(true);
                    setMenu(false);
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void useDocumentStore.getState().duplicateDesign(design.id);
                    setMenu(false);
                  }}
                >
                  Duplicate
                </button>
                {piles.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      void useDocumentStore.getState().setListedFolder(design.id, name);
                      setMenu(false);
                    }}
                  >
                    Move to {name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const next = window.prompt("New pile name")?.trim();
                    if (next) void useDocumentStore.getState().setListedFolder(design.id, next.slice(0, 80));
                    setMenu(false);
                  }}
                >
                  New pile…
                </button>
                {design.folder ? (
                  <button
                    type="button"
                    onClick={() => {
                      void useDocumentStore.getState().setListedFolder(design.id, undefined);
                      setMenu(false);
                    }}
                  >
                    Remove from pile
                  </button>
                ) : null}
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    void useDocumentStore.getState().deleteDesign(design.id);
                    setMenu(false);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
