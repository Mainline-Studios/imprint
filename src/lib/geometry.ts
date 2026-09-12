export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number): number {
  return Math.round(value);
}

export type Box = { x: number; y: number; width: number; height: number };

export function clientToPage(
  clientX: number,
  clientY: number,
  container: HTMLElement,
  panX: number,
  panY: number,
  zoom: number,
): { x: number; y: number } {
  const r = container.getBoundingClientRect();
  return {
    x: (clientX - r.left - panX) / zoom,
    y: (clientY - r.top - panY) / zoom,
  };
}
