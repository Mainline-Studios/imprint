import type { CanvasObject, Design, Page } from "../types";
import { uuid } from "./ids";

export function cloneObject(obj: CanvasObject, dx = 0, dy = 0): CanvasObject {
  return { ...obj, id: uuid(), x: obj.x + dx, y: obj.y + dy };
}

export function clonePage(page: Page, dx = 0, dy = 0): Page {
  return {
    id: uuid(),
    background: page.background,
    objects: page.objects.map((o) => cloneObject(o, dx, dy)),
    ...(page.role ? { role: page.role } : {}),
  };
}

export function cloneDesign(design: Design, name = `${design.name} copy`): Design {
  return {
    id: uuid(),
    name,
    width: design.width,
    height: design.height,
    updatedAt: Date.now(),
    pages: design.pages.map((p) => clonePage(p)),
    ...(design.shirt ? { shirt: { ...design.shirt } } : {}),
  };
}

export function scalePage(page: Page, fromW: number, fromH: number, toW: number, toH: number): Page {
  const sx = toW / fromW;
  const sy = toH / fromH;
  return {
    ...page,
    id: uuid(),
    objects: page.objects.map((obj) => {
      if (obj.type === "text") {
        return {
          ...obj,
          id: uuid(),
          x: obj.x * sx,
          y: obj.y * sy,
          width: obj.width * sx,
          fontSize: Math.max(8, obj.fontSize * sy),
        };
      }
      return {
        ...obj,
        id: uuid(),
        x: obj.x * sx,
        y: obj.y * sy,
        width: obj.width * sx,
        height: obj.height * sy,
      };
    }),
  };
}
