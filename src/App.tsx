import { useEffect, useRef, useState } from "react";
import { Home } from "./home/Home";
import { EditorShell } from "./editor/EditorShell";
import { saveDesign } from "./persist/save";
import { ShareView } from "./share/ShareView";
import { useDocumentStore } from "./store/document";

function shareTokenFromHash(): string | null {
  const raw = window.location.hash.replace(/^#/, "").replace(/^\/+/, "");
  const match = /^s\/([^/]+)/.exec(raw);
  return match?.[1] ?? null;
}

export default function App() {
  const view = useDocumentStore((s) => s.view);
  const design = useDocumentStore((s) => s.design);
  const timer = useRef<number | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(() => shareTokenFromHash());

  useEffect(() => {
    function onHash() {
      setShareToken(shareTokenFromHash());
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

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

  if (shareToken) return <ShareView token={shareToken} />;
  return view === "home" ? <Home /> : <EditorShell />;
}
