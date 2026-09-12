import { useState } from "react";
import { MiniPreview } from "../canvas/MiniPreview";
import { SHIRT_VIEW_LABELS, canDeleteShirtPage, isShirtView } from "../lib/shirt";
import { useDocumentStore } from "../store/document";
import { isTshirtSize } from "../templates/presets";

export function PageStrip() {
  const design = useDocumentStore((s) => s.design);
  const current = useDocumentStore((s) => s.currentPageIndex);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  if (!design) return null;

  const tshirt = isTshirtSize(design.width, design.height);
  const canDelete = canDeleteShirtPage(design, current);

  return (
    <div className="page-strip">
      <div className="page-scroller">
        {design.pages.map((page, i) => (
          <button
            key={page.id}
            type="button"
            className={i === current ? "page-chip on" : "page-chip"}
            draggable
            onDragStart={() => setDragFrom(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragFrom != null) useDocumentStore.getState().reorderPages(dragFrom, i);
              setDragFrom(null);
            }}
            onClick={() => useDocumentStore.getState().setPageIndex(i)}
          >
            <MiniPreview
              className="page-mini"
              width={design.width}
              height={design.height}
              background={page.background}
              objects={page.objects}
            />
            <span>{tshirt && isShirtView(page.role) ? SHIRT_VIEW_LABELS[page.role] : i + 1}</span>
          </button>
        ))}
        <button type="button" className="page-add" onClick={() => useDocumentStore.getState().addPage()} title="Add page">
          +
        </button>
      </div>
      <div className="page-ops">
        <button type="button" className="icon-btn" onClick={() => useDocumentStore.getState().duplicatePage()}>
          Duplicate page
        </button>
        <button
          type="button"
          className="icon-btn"
          disabled={!canDelete}
          onClick={() => useDocumentStore.getState().deletePage()}
        >
          Delete page
        </button>
      </div>
    </div>
  );
}
