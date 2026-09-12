import { EditorStage } from "../canvas/EditorStage";
import { Inspector } from "../inspector/Inspector";
import { Sidebar } from "../library/Sidebar";
import { useDocumentStore } from "../store/document";
import { Keyboard } from "./Keyboard";
import { PageStrip } from "./PageStrip";
import { PresentMode } from "./PresentMode";
import { TopBar } from "./TopBar";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function EditorShell() {
  const exporting = useDocumentStore((s) => s.exporting);

  return (
    <div
      className="editor"
      onContextMenu={(e) => {
        if (isTypingTarget(e.target)) return;
        e.preventDefault();
      }}
    >
      <Keyboard />
      <TopBar />
      <Sidebar />
      <EditorStage />
      <Inspector />
      <PageStrip />
      <PresentMode />
      {exporting && (
        <div className="export-overlay" role="status">
          Exporting…
        </div>
      )}
    </div>
  );
}
