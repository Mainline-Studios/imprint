import { useEffect } from "react";
import { selectedObjects, useDocumentStore } from "../store/document";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function isPrintable(e: KeyboardEvent): boolean {
  return e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey;
}

const NUDGE_TINY = 1;
const NUDGE_STEP = 4;
const NUDGE_LARGE = 24;

function nudgeFromEvent(e: KeyboardEvent): { dx: number; dy: number } | null {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (e.key === "<" || (e.key === "," && !e.shiftKey)) return { dx: -NUDGE_TINY, dy: 0 };
  if (e.key === ">" || (e.key === "." && !e.shiftKey)) return { dx: NUDGE_TINY, dy: 0 };
  const step = e.shiftKey ? NUDGE_LARGE : NUDGE_STEP;
  if (e.key === "ArrowLeft") return { dx: -step, dy: 0 };
  if (e.key === "ArrowRight") return { dx: step, dy: 0 };
  if (e.key === "ArrowUp") return { dx: 0, dy: -step };
  if (e.key === "ArrowDown") return { dx: 0, dy: step };
  return null;
}

export function Keyboard() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const state = useDocumentStore.getState();
      if (e.code === "Space" && !isTypingTarget(e.target) && !state.editingTextId) {
        const one = selectedObjects(state)[0];
        const typingObject = one?.type === "text" || one?.type === "button";
        if (!typingObject || state.selectedIds.length !== 1) {
          e.preventDefault();
          state.setSpaceDown(true);
          return;
        }
      }
      if (isTypingTarget(e.target) && e.key !== "Escape") return;
      if (state.editingTextId && e.key !== "Escape") return;

      const meta = e.metaKey || e.ctrlKey;
      const selected = selectedObjects(state);
      const one = selected.length === 1 ? selected[0] : null;
      const editable = one?.type === "text" || one?.type === "button";

      if (e.key === "Escape") {
        if (state.editingTextId) state.setEditingText(null);
        else state.clearSelection();
        return;
      }

      const nudge = nudgeFromEvent(e);
      if (nudge) {
        e.preventDefault();
        state.nudgeSelected(nudge.dx, nudge.dy);
        return;
      }

      if (!meta && editable && isPrintable(e)) {
        e.preventDefault();
        state.beginHistory();
        state.updateObject(one.id, { text: e.key }, { record: false });
        state.setEditingText(one.id, { selectAll: false });
        return;
      }

      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) state.redo();
        else state.undo();
        return;
      }
      if (meta && e.key.toLowerCase() === "y") {
        e.preventDefault();
        state.redo();
        return;
      }
      if (meta && e.key.toLowerCase() === "d") {
        e.preventDefault();
        state.duplicateSelected();
        return;
      }
      if (meta && e.key.toLowerCase() === "c") {
        e.preventDefault();
        state.copySelected();
        return;
      }
      if (meta && e.key.toLowerCase() === "v") {
        e.preventDefault();
        state.pasteClipboard();
        return;
      }
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        state.deleteSelected();
        return;
      }
      if (!meta && e.key.toLowerCase() === "v") {
        state.clearSelection();
        return;
      }
      if (!meta && e.key.toLowerCase() === "t") {
        e.preventDefault();
        state.addAt({ kind: "text", variant: "heading" });
        return;
      }
      if (!meta && e.key.toLowerCase() === "r") {
        e.preventDefault();
        state.addAt({ kind: "shape", shape: "rect" });
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") useDocumentStore.getState().setSpaceDown(false);
    }

    function onBlur() {
      useDocumentStore.getState().setSpaceDown(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return null;
}
