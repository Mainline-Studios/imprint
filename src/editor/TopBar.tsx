import { useEffect, useRef, useState } from "react";
import { AccountMenu } from "../auth/AccountMenu";
import { ExportPanel, runChosenExport, type ExportOpts } from "./ExportPanel";
import { useDocumentStore } from "../store/document";
import { SIZE_PRESETS, presetLabel } from "../templates/presets";

export function TopBar() {
  const design = useDocumentStore((s) => s.design);
  const zoom = useDocumentStore((s) => s.zoom);
  const past = useDocumentStore((s) => s.past);
  const future = useDocumentStore((s) => s.future);
  const exportOpen = useDocumentStore((s) => s.exportOpen);
  const savedAt = useDocumentStore((s) => s.savedAt);
  const updatedAt = design?.updatedAt;
  const dirty = design != null && savedAt != null && updatedAt != null && updatedAt > savedAt;
  const [toast, setToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        useDocumentStore.getState().setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!design) return null;

  async function runExport(fn: () => Promise<void>) {
    const state = useDocumentStore.getState();
    state.setExportOpen(false);
    state.setExporting(true);
    try {
      await fn();
    } finally {
      state.setExporting(false);
    }
  }

  function download(opts: ExportOpts) {
    const state = useDocumentStore.getState();
    const current = state.design;
    if (!current) return;
    const pageIndex = opts.pages === "all" ? "all" : state.currentPageIndex;
    void runExport(() => runChosenExport(current, pageIndex, opts));
  }

  return (
    <header className="topbar">
      <button type="button" className="wordmark small" onClick={() => void useDocumentStore.getState().closeToHome()}>
        <span className="mark" aria-hidden>
          I
        </span>
        Imprint
      </button>
      <input
        className="title-input"
        value={design.name}
        onChange={(e) => useDocumentStore.getState().setName(e.target.value)}
        aria-label="Design name"
      />
      <select
        className="size-select"
        value={SIZE_PRESETS.find((p) => p.width === design.width && p.height === design.height)?.id ?? "custom"}
        onChange={(e) => {
          const preset = SIZE_PRESETS.find((p) => p.id === e.target.value);
          if (preset) useDocumentStore.getState().resizeCanvas(preset.width, preset.height);
        }}
        aria-label="Canvas size"
      >
        {SIZE_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
        {!SIZE_PRESETS.some((p) => p.width === design.width && p.height === design.height) && (
          <option value="custom">{presetLabel(design.width, design.height)}</option>
        )}
      </select>

      <div className="top-actions">
        <button type="button" className="icon-btn" disabled={past.length === 0} onClick={() => useDocumentStore.getState().undo()} title="Undo">
          Undo
        </button>
        <button type="button" className="icon-btn" disabled={future.length === 0} onClick={() => useDocumentStore.getState().redo()} title="Redo">
          Redo
        </button>
        <div className="zoom-ctrl">
          <button type="button" className="icon-btn" onClick={() => useDocumentStore.getState().setZoom(zoom / 1.15)}>
            −
          </button>
          <button type="button" className="zoom-pct" onClick={() => useDocumentStore.getState().fitToScreen()}>
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" className="icon-btn" onClick={() => useDocumentStore.getState().setZoom(zoom * 1.15)}>
            +
          </button>
        </div>
        <span className="save-pill">{dirty ? "Saving" : "Saved"}</span>
        <AccountMenu variant="topbar" />
        <div className="export-wrap" ref={menuRef}>
          <button
            type="button"
            className="btn-primary"
            aria-expanded={exportOpen}
            aria-haspopup="dialog"
            onClick={() => useDocumentStore.getState().setExportOpen(!exportOpen)}
          >
            Export
          </button>
          {exportOpen && <ExportPanel onDownload={download} />}
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
      <ToastBridge onToast={setToast} />
    </header>
  );
}

function ToastBridge({ onToast }: { onToast: (s: string | null) => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        onToast("Saved on this device");
        window.setTimeout(() => onToast(null), 1400);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onToast]);
  return null;
}
