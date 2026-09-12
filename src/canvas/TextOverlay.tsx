import { useEffect, useLayoutEffect, useRef } from "react";
import type Konva from "konva";
import { fontOf } from "../fonts/catalog";
import { lineHeightOf, overlayTextStyle } from "../text/effects";
import { useDocumentStore } from "../store/document";
import type { ButtonObject, TextObject } from "../types";

export function TextOverlay({
  obj,
  stage,
  container,
}: {
  obj: TextObject | ButtonObject;
  stage: Konva.Stage | null;
  container: HTMLElement | null;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const original = useRef(obj.text);
  const selectAll = useDocumentStore((s) => s.editingSelectAll);

  useEffect(() => {
    original.current = obj.text;
    useDocumentStore.getState().beginHistory();
    return () => {
      useDocumentStore.getState().endHistory();
    };
  }, [obj.id]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (selectAll) el.select();
    else el.setSelectionRange(el.value.length, el.value.length);
  }, [obj.id, selectAll]);

  useEffect(() => {
    const el = ref.current;
    const node = stage?.findOne("#" + obj.id);
    if (!el || !node || !container) return;
    const box = node.getClientRect({ skipTransform: false });
    el.style.left = `${box.x}px`;
    el.style.top = `${box.y}px`;
    el.style.width = `${Math.max(box.width, 40)}px`;
    el.style.height = `${Math.max(box.height, obj.fontSize * (obj.type === "text" ? lineHeightOf(obj) : 1.2))}px`;
  }, [obj, stage, container]);

  function close() {
    useDocumentStore.getState().setEditingText(null);
  }

  const zoom = useDocumentStore((s) => s.zoom);
  const style =
    obj.type === "button"
      ? {
          fontFamily: fontOf(obj.fontFamily),
          fontSize: `${obj.fontSize * zoom}px`,
          fontWeight: obj.fontWeight,
          color: obj.textFill,
          textAlign: "center" as const,
          lineHeight: 1.2,
        }
      : overlayTextStyle(obj, zoom);

  return (
    <textarea
      ref={ref}
      className="text-overlay"
      value={obj.text}
      style={style}
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) =>
        useDocumentStore.getState().updateObject(obj.id, { text: e.target.value }, { record: false })
      }
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          close();
        } else if (e.key === "Escape") {
          e.preventDefault();
          useDocumentStore.getState().updateObject(obj.id, { text: original.current }, { record: false });
          close();
        }
      }}
      onBlur={() => close()}
    />
  );
}
