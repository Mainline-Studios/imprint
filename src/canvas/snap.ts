import type { Box } from "../lib/geometry";

export type Guides = { v: number[]; h: number[] };

const EMPTY: Guides = { v: [], h: [] };

export function snapBox(
  box: Box,
  others: Box[],
  page: { width: number; height: number },
  threshold: number,
): { x: number; y: number; guides: Guides } {
  const candidatesX = [0, page.width / 2, page.width];
  const candidatesY = [0, page.height / 2, page.height];
  for (const o of others) {
    candidatesX.push(o.x, o.x + o.width / 2, o.x + o.width);
    candidatesY.push(o.y, o.y + o.height / 2, o.y + o.height);
  }

  const edgesX = [
    { value: box.x, offset: 0 },
    { value: box.x + box.width / 2, offset: box.width / 2 },
    { value: box.x + box.width, offset: box.width },
  ];
  const edgesY = [
    { value: box.y, offset: 0 },
    { value: box.y + box.height / 2, offset: box.height / 2 },
    { value: box.y + box.height, offset: box.height },
  ];

  let bestX = { dist: threshold, x: box.x, guide: null as number | null };
  let bestY = { dist: threshold, y: box.y, guide: null as number | null };

  for (const edge of edgesX) {
    for (const c of candidatesX) {
      const dist = Math.abs(edge.value - c);
      if (dist < bestX.dist) {
        bestX = { dist, x: c - edge.offset, guide: c };
      }
    }
  }
  for (const edge of edgesY) {
    for (const c of candidatesY) {
      const dist = Math.abs(edge.value - c);
      if (dist < bestY.dist) {
        bestY = { dist, y: c - edge.offset, guide: c };
      }
    }
  }

  return {
    x: bestX.guide === null ? box.x : bestX.x,
    y: bestY.guide === null ? box.y : bestY.y,
    guides: {
      v: bestX.guide === null ? [] : [bestX.guide],
      h: bestY.guide === null ? [] : [bestY.guide],
    },
  };
}

export { EMPTY as EMPTY_GUIDES };
