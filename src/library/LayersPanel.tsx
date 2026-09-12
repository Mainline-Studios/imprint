import { currentPage, useDocumentStore } from "../store/document";
import type { CanvasObject } from "../types";

export function LayersPanel() {
  const selectedIds = useDocumentStore((s) => s.selectedIds);
  const pageIndex = useDocumentStore((s) => s.currentPageIndex);
  const design = useDocumentStore((s) => s.design);
  const page = design?.pages[pageIndex] ?? currentPage(useDocumentStore.getState());
  const objects = page ? [...page.objects].reverse() : [];

  if (!page || objects.length === 0) {
    return <p className="hint">Nothing on this page yet. Add type, a shape, or a sticker.</p>;
  }

  return (
    <div className="layers-list">
      <p className="hint">Front of the page at the top. Click a row to select it.</p>
      {objects.map((obj) => {
        const on = selectedIds.includes(obj.id);
        const hidden = obj.visible === false;
        return (
          <div key={obj.id} className={on ? "layer-row on" : "layer-row"}>
            <button
              type="button"
              className="layer-name"
              onClick={(e) => useDocumentStore.getState().select([obj.id], e.shiftKey)}
            >
              {layerLabel(obj)}
            </button>
            <button
              type="button"
              className={hidden ? "layer-icon on" : "layer-icon"}
              title={hidden ? "Show" : "Hide"}
              onClick={() => useDocumentStore.getState().setObjectVisible(obj.id, hidden)}
            >
              {hidden ? "Hidden" : "Hide"}
            </button>
            <button
              type="button"
              className={obj.locked ? "layer-icon on" : "layer-icon"}
              title={obj.locked ? "Unlock" : "Lock"}
              onClick={() =>
                useDocumentStore.getState().updateObject(obj.id, { locked: !obj.locked })
              }
            >
              {obj.locked ? "Locked" : "Lock"}
            </button>
          </div>
        );
      })}
      <div className="seg wrap" style={{ marginTop: 10 }}>
        <button type="button" onClick={() => useDocumentStore.getState().bringForward()}>
          Forward
        </button>
        <button type="button" onClick={() => useDocumentStore.getState().sendBackward()}>
          Backward
        </button>
      </div>
    </div>
  );
}

function layerLabel(obj: CanvasObject): string {
  if (obj.type === "text") return obj.text.trim().slice(0, 28) || "Text";
  if (obj.type === "button") return obj.text.trim().slice(0, 28) || "Button";
  if (obj.type === "image") return "Image";
  if (obj.type === "sticker") return "Sticker";
  if (obj.shape === "rect") return "Rectangle";
  if (obj.shape === "ellipse") return "Ellipse";
  if (obj.shape === "triangle") return "Triangle";
  return "Line";
}
