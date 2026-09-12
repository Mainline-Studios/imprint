import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import { Group } from "react-konva";
import type { ReactNode } from "react";
import type { CanvasObject } from "../types";
import { objectHeight } from "./bake";
import { EMPTY_GUIDES, snapBox, type Guides } from "./snap";
import { useDocumentStore } from "../store/document";

type Props = {
  obj: CanvasObject;
  children: ReactNode;
  onGuides: (guides: Guides) => void;
  onDblClick?: () => void;
};

export function ObjectGroup({ obj, children, onGuides, onDblClick }: Props) {
  const spaceDown = useDocumentStore((s) => s.spaceDown);
  const editingTextId = useDocumentStore((s) => s.editingTextId);
  const selectedIds = useDocumentStore((s) => s.selectedIds);

  return (
    <Group
      id={obj.id}
      name="object"
      x={obj.x}
      y={obj.y}
      rotation={obj.rotation}
      opacity={editingTextId === obj.id && obj.type === "text" ? 0 : obj.opacity}
      draggable={!spaceDown && editingTextId !== obj.id}
      onMouseDown={(e) => {
        e.cancelBubble = true;
        const additive = e.evt.shiftKey;
        useDocumentStore.getState().select([obj.id], additive);
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        onDblClick?.();
      }}
      onDragStart={() => {
        useDocumentStore.getState().beginHistory();
      }}
      onDragMove={(e: KonvaEventObject<DragEvent>) => {
        const node = e.target as Konva.Group;
        const state = useDocumentStore.getState();
        const design = state.design;
        if (!design) return;
        const page = design.pages[state.currentPageIndex];
        const others = page.objects
          .filter((o) => o.id !== obj.id && !state.selectedIds.includes(o.id))
          .map((o) => ({ x: o.x, y: o.y, width: o.width, height: objectHeight(o) }));
        const box = {
          x: node.x(),
          y: node.y(),
          width: obj.width,
          height: objectHeight(obj),
        };
        const snapped = snapBox(box, others, design, 8 / state.zoom);
        node.x(snapped.x);
        node.y(snapped.y);
        onGuides(snapped.guides);

        if (selectedIds.length > 1) {
          const dx = snapped.x - obj.x;
          const dy = snapped.y - obj.y;
          const layer = node.getLayer();
          for (const id of selectedIds) {
            if (id === obj.id) continue;
            const otherObj = page.objects.find((o) => o.id === id);
            const otherNode = layer?.findOne("#" + id) as Konva.Group | undefined;
            if (otherObj && otherNode) {
              otherNode.x(otherObj.x + dx);
              otherNode.y(otherObj.y + dy);
            }
          }
        }
      }}
      onDragEnd={(e) => {
        onGuides(EMPTY_GUIDES);
        const node = e.target as Konva.Group;
        const state = useDocumentStore.getState();
        const page = state.design?.pages[state.currentPageIndex];
        const layer = node.getLayer();
        if (!page || !layer) {
          state.endHistory();
          return;
        }
        const ids = state.selectedIds.includes(obj.id) ? state.selectedIds : [obj.id];
        for (const id of ids) {
          const n = layer.findOne("#" + id) as Konva.Group | undefined;
          if (n) state.updateObject(id, { x: n.x(), y: n.y() }, { record: false });
        }
        state.endHistory();
      }}
    >
      {children}
    </Group>
  );
}
