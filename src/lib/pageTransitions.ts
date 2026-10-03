import { PAGE_TRANSITION_KINDS, type Page, type PageTransition, type PageTransitionKind } from "../types";

export const PAGE_TRANSITION_LABELS: Record<PageTransitionKind, string> = {
  none: "None",
  fade: "Fade",
  "slide-left": "Slide left",
  "slide-right": "Slide right",
  "slide-up": "Slide up",
  "slide-down": "Slide down",
  zoom: "Zoom",
  flip: "Flip",
};

export const DEFAULT_TRANSITION_MS = 420;

export function isPageTransitionKind(value: string): value is PageTransitionKind {
  return (PAGE_TRANSITION_KINDS as readonly string[]).includes(value);
}

export function clampTransitionMs(ms: number): number {
  if (!Number.isFinite(ms)) return DEFAULT_TRANSITION_MS;
  return Math.max(0, Math.min(2000, Math.round(ms)));
}

export function findPageTransition(page: Pick<Page, "transitions"> | undefined, toId: string): PageTransition | undefined {
  return page?.transitions?.find((t) => t.toId === toId);
}

export function upsertPageTransition(list: PageTransition[] | undefined, next: PageTransition): PageTransition[] {
  const rest = (list ?? []).filter((t) => t.toId !== next.toId);
  return [...rest, { toId: next.toId, kind: next.kind, durationMs: clampTransitionMs(next.durationMs) }];
}

export function removePageTransition(list: PageTransition[] | undefined, toId: string): PageTransition[] {
  return (list ?? []).filter((t) => t.toId !== toId);
}

export function pageWithTransitions(page: Page, transitions: PageTransition[]): Page {
  const next: Page = { ...page };
  if (transitions.length) next.transitions = transitions;
  else delete next.transitions;
  return next;
}

/** Remap destination ids after pages are cloned. Drops links whose target was not cloned. */
export function remapPageTransitions(
  list: PageTransition[] | undefined,
  idMap: Map<string, string>,
): PageTransition[] | undefined {
  if (!list?.length) return undefined;
  const next: PageTransition[] = [];
  for (const t of list) {
    const toId = idMap.get(t.toId);
    if (!toId || !isPageTransitionKind(t.kind)) continue;
    next.push({ toId, kind: t.kind, durationMs: clampTransitionMs(t.durationMs) });
  }
  return next.length ? next : undefined;
}

export function dropTransitionsTo(pages: Page[], removedId: string): Page[] {
  return pages.map((page) => {
    if (!page.transitions?.some((t) => t.toId === removedId)) return page;
    return pageWithTransitions(
      page,
      page.transitions.filter((t) => t.toId !== removedId),
    );
  });
}
