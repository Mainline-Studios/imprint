import { useEffect } from "react";
import { MiniPreview } from "../canvas/MiniPreview";
import { useDocumentStore } from "../store/document";

export function PresentMode() {
  const design = useDocumentStore((s) => s.design);
  const pageIndex = useDocumentStore((s) => s.currentPageIndex);
  const presenting = useDocumentStore((s) => s.presenting);

  useEffect(() => {
    if (!presenting) return;
    function go(delta: number) {
      const state = useDocumentStore.getState();
      const current = state.design;
      if (!current) return;
      const next = Math.max(0, Math.min(current.pages.length - 1, state.currentPageIndex + delta));
      state.setPageIndex(next);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        useDocumentStore.getState().setPresenting(false);
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.code === "Space") {
        e.preventDefault();
        go(1);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "Backspace") {
        e.preventDefault();
        go(-1);
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [presenting]);

  if (!presenting || !design) return null;
  const page = design.pages[pageIndex];
  if (!page) return null;

  return (
    <div
      className="present-mode"
      role="dialog"
      aria-label="Present"
      onClick={() => {
        const state = useDocumentStore.getState();
        const current = state.design;
        if (!current) return;
        state.setPageIndex(Math.min(current.pages.length - 1, state.currentPageIndex + 1));
      }}
    >
      <div
        className="present-fit"
        style={{ width: `min(100vw, calc(100vh * ${design.width} / ${design.height}))` }}
      >
        <MiniPreview
          className="present-page"
          width={design.width}
          height={design.height}
          background={page.background}
          objects={page.objects}
        />
      </div>
      <p className="present-hint">
        {pageIndex + 1} / {design.pages.length} · Click or → next · Backspace previous · Esc to leave
      </p>
    </div>
  );
}
