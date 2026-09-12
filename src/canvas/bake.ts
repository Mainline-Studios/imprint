import type Konva from "konva";
import { textVisualHeight } from "../text/effects";
import type { CanvasObject } from "../types";

export function bakeGroup(node: Konva.Group, obj: CanvasObject): Partial<CanvasObject> {
  const scaleX = node.scaleX();
  const scaleY = node.scaleY();
  node.scaleX(1);
  node.scaleY(1);
  const width = Math.max(8, obj.width * Math.abs(scaleX));
  const patch: Partial<CanvasObject> = {
    x: node.x(),
    y: node.y(),
    width,
    rotation: node.rotation(),
  };
  if (obj.type === "text") {
    return { ...patch, fontSize: Math.max(8, obj.fontSize * Math.abs(scaleY)) };
  }
  return { ...patch, height: Math.max(8, obj.height * Math.abs(scaleY)) };
}

export function objectHeight(obj: CanvasObject): number {
  if (obj.type === "text") return textVisualHeight(obj);
  return obj.height;
}
