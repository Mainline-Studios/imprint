import { useEffect, useRef } from "react";
import { Home } from "./home/Home";
import { EditorShell } from "./editor/EditorShell";
import { saveDesign } from "./persist/save";
import { useDocumentStore } from "./store/document";

export default function App() {
  const view = useDocumentStore((s) => s.view);
  const design = useDocumentStore((s) => s.design);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (view !== "editor" || !design) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const current = useDocumentStore.getState().design;
      if (!current) return;
      void saveDesign(current).then(() => {
        useDocumentStore.setState({ savedAt: current.updatedAt });
      });
    }, 400);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [design, view]);

  return view === "home" ? <Home /> : <EditorShell />;
}
