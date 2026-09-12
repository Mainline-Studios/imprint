import type { CanvasObject, Design, Page } from "../types";
import { uuid } from "./ids";

export function cloneObject(obj: CanvasObject, dx = 0, dy = 0): CanvasObject {
  return { ...obj, id: uuid(), x: obj.x + dx, y: obj.y + dy };
}

export function remapGroupIds(objects: CanvasObject[]): CanvasObject[] {
  const map = new Map<string, string>();
  return objects.map((obj) => {
    if (!obj.groupId) return obj;
    let next = map.get(obj.groupId);
    if (!next) {
      next = uuid();
      map.set(obj.groupId, next);
    }
    return { ...obj, groupId: next };
  });
}

export function clonePage(page: Page, dx = 0, dy = 0): Page {
  return {
    id: uuid(),
    background: page.background,
    objects: remapGroupIds(page.objects.map((o) => cloneObject(o, dx, dy))),
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
    ...(design.brandColors ? { brandColors: [...design.brandColors] } : {}),
    ...(design.folder ? { folder: design.folder } : {}),
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
