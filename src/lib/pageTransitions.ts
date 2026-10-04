import {
  LEGACY_PAGE_TRANSITION_KINDS,
  PAGE_TRANSITION_DIRECTIONS,
  PAGE_TRANSITION_EASINGS,
  PAGE_TRANSITION_KINDS,
  type LegacyPageTransitionKind,
  type Page,
  type PageTransition,
  type PageTransitionDirection,
  type PageTransitionEasing,
  type PageTransitionKind,
} from "../types";

export const PAGE_TRANSITION_LABELS: Record<PageTransitionKind, string> = {
  none: "None",
  fade: "Fade",
  slide: "Slide",
  push: "Push",
  cover: "Cover",
  reveal: "Reveal",
  "zoom-in": "Zoom in",
  "zoom-out": "Zoom out",
  flip: "Flip",
  cube: "Cube",
  dissolve: "Dissolve",
  wipe: "Wipe",
  spring: "Spring",
  pitch: "Pitch",
  "magic-move": "Magic Move",
};

export const PAGE_TRANSITION_DESCRIPTIONS: Record<PageTransitionKind, string> = {
  none: "Cuts straight to the next page.",
  fade: "Crossfades opacity, with no movement.",
  slide: "The next page glides in. The previous one fades in place.",
  push: "Both pages travel together.",
  cover: "The next page slides over a page that stays put.",
  reveal: "The current page slides away and uncovers the next one.",
  "zoom-in": "The next page grows into place. The previous one scales up and fades.",
  "zoom-out": "The next page shrinks into place. The previous one scales down and fades.",
  flip: "Turns the page around a vertical axis.",
  cube: "Rotates both pages like faces of a cube.",
  dissolve: "Fades through a soft blur, distinct from a plain fade.",
  wipe: "Opens the next page with a hard edge.",
  spring: "Slides in, overshoots, and settles.",
  pitch: "A fast, long slide with a little spin, like a pitch.",
  "magic-move": "Shared pieces glide to their new spot. Everything else fades.",
};

export const DIRECTION_LABELS: Record<PageTransitionDirection, string> = {
  left: "Left",
  right: "Right",
  up: "Up",
  down: "Down",
};

export const EASING_LABELS: Record<PageTransitionEasing, string> = {
  ease: "Ease",
  "ease-in": "Ease in",
  "ease-out": "Ease out",
  "ease-in-out": "Ease in-out",
  linear: "Linear",
  spring: "Spring",
};

export const DEFAULT_TRANSITION_MS = 420;

const LEGACY_MAP: Record<
  LegacyPageTransitionKind,
  { kind: PageTransitionKind; direction?: PageTransitionDirection }
> = {
  "slide-left": { kind: "slide", direction: "left" },
  "slide-right": { kind: "slide", direction: "right" },
  "slide-up": { kind: "slide", direction: "up" },
  "slide-down": { kind: "slide", direction: "down" },
  zoom: { kind: "zoom-in" },
};

export type ResolvedTransition = {
  kind: PageTransitionKind;
  durationMs: number;
  direction: PageTransitionDirection;
  easing: PageTransitionEasing;
};

export function isPageTransitionKind(value: string): value is PageTransitionKind {
  return (PAGE_TRANSITION_KINDS as readonly string[]).includes(value);
}

export function isLegacyPageTransitionKind(value: string): value is LegacyPageTransitionKind {
  return (LEGACY_PAGE_TRANSITION_KINDS as readonly string[]).includes(value);
}

export function isStoredPageTransitionKind(value: string): value is PageTransition["kind"] {
  return isPageTransitionKind(value) || isLegacyPageTransitionKind(value);
}

export function isPageTransitionDirection(value: string): value is PageTransitionDirection {
  return (PAGE_TRANSITION_DIRECTIONS as readonly string[]).includes(value);
}

export function isPageTransitionEasing(value: string): value is PageTransitionEasing {
  return (PAGE_TRANSITION_EASINGS as readonly string[]).includes(value);
}

export function kindHasDirection(kind: PageTransitionKind): boolean {
  return (
    kind === "slide" ||
    kind === "push" ||
    kind === "cover" ||
    kind === "reveal" ||
    kind === "wipe" ||
    kind === "cube" ||
    kind === "spring" ||
    kind === "pitch"
  );
}

export function defaultEasing(kind: PageTransitionKind): PageTransitionEasing {
  if (kind === "slide" || kind === "cover" || kind === "zoom-in" || kind === "pitch") return "ease-out";
  if (kind === "reveal" || kind === "zoom-out") return "ease-in";
  if (kind === "push" || kind === "flip" || kind === "cube" || kind === "wipe" || kind === "magic-move") {
    return "ease-in-out";
  }
  if (kind === "spring") return "spring";
  if (kind === "none") return "linear";
  return "ease";
}

/** Incoming travel. Left means the next page comes in from the right. Pitch uses left too. */
export function defaultDirection(): PageTransitionDirection {
  return "left";
}

/** Spring is a cubic-bezier overshoot. The rest are CSS keywords. */
export function cssTiming(easing: PageTransitionEasing): string {
  if (easing === "spring") return "cubic-bezier(0.34, 1.45, 0.64, 1)";
  return easing;
}

export function clampTransitionMs(ms: number): number {
  if (!Number.isFinite(ms)) return DEFAULT_TRANSITION_MS;
  return Math.max(0, Math.min(2000, Math.round(ms)));
}

export function resolvePageTransition(jump: {
  kind: string;
  durationMs: number;
  direction?: string;
  easing?: string;
}): ResolvedTransition | null {
  let kind: PageTransitionKind | null = null;
  let legacyDirection: PageTransitionDirection | undefined;
  if (isPageTransitionKind(jump.kind)) kind = jump.kind;
  else if (isLegacyPageTransitionKind(jump.kind)) {
    const mapped = LEGACY_MAP[jump.kind];
    kind = mapped.kind;
    legacyDirection = mapped.direction;
  }
  if (!kind) return null;
  const direction = isPageTransitionDirection(jump.direction ?? "")
    ? (jump.direction as PageTransitionDirection)
    : (legacyDirection ?? defaultDirection());
  const easing = isPageTransitionEasing(jump.easing ?? "") ? (jump.easing as PageTransitionEasing) : defaultEasing(kind);
  return { kind, durationMs: clampTransitionMs(jump.durationMs), direction, easing };
}

export function transitionSummary(jump: PageTransition): string {
  const resolved = resolvePageTransition(jump);
  if (!resolved) return `${jump.kind} · ${clampTransitionMs(jump.durationMs)}ms`;
  const dir = kindHasDirection(resolved.kind) ? ` ${DIRECTION_LABELS[resolved.direction].toLowerCase()}` : "";
  return `${PAGE_TRANSITION_LABELS[resolved.kind]}${dir} · ${resolved.durationMs}ms`;
}

export function findPageTransition(page: Pick<Page, "transitions"> | undefined, toId: string): PageTransition | undefined {
  return page?.transitions?.find((t) => t.toId === toId);
}

export function upsertPageTransition(list: PageTransition[] | undefined, next: PageTransition): PageTransition[] {
  const resolved = resolvePageTransition(next);
  if (!resolved) return list ?? [];
  const rest = (list ?? []).filter((t) => t.toId !== next.toId);
  const stored: PageTransition = {
    toId: next.toId,
    kind: resolved.kind,
    durationMs: resolved.durationMs,
  };
  if (kindHasDirection(resolved.kind)) stored.direction = resolved.direction;
  if (resolved.kind !== "none") stored.easing = resolved.easing;
  return [...rest, stored];
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

/** Remap destination ids after pages are cloned. Drops links whose target was not cloned. Keeps legacy kinds. */
export function remapPageTransitions(
  list: PageTransition[] | undefined,
  idMap: Map<string, string>,
): PageTransition[] | undefined {
  if (!list?.length) return undefined;
  const next: PageTransition[] = [];
  for (const t of list) {
    const toId = idMap.get(t.toId);
    if (!toId || !isStoredPageTransitionKind(t.kind)) continue;
    const stored: PageTransition = { toId, kind: t.kind, durationMs: clampTransitionMs(t.durationMs) };
    if (t.direction && isPageTransitionDirection(t.direction)) stored.direction = t.direction;
    if (t.easing && isPageTransitionEasing(t.easing)) stored.easing = t.easing;
    next.push(stored);
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
