import { useState } from "react";
import { Field } from "./ColorField";
import {
  DEFAULT_TRANSITION_MS,
  DIRECTION_LABELS,
  EASING_LABELS,
  findPageTransition,
  kindHasDirection,
  PAGE_TRANSITION_DESCRIPTIONS,
  PAGE_TRANSITION_LABELS,
  resolvePageTransition,
  transitionSummary,
} from "../lib/pageTransitions";
import { useDocumentStore } from "../store/document";
import {
  PAGE_TRANSITION_DIRECTIONS,
  PAGE_TRANSITION_EASINGS,
  PAGE_TRANSITION_KINDS,
  type Design,
  type PageTransitionDirection,
  type PageTransitionEasing,
  type PageTransitionKind,
} from "../types";

export function PageChangesPanel({ design }: { design: Design }) {
  const current = useDocumentStore((s) => s.currentPageIndex);
  const [from, setFrom] = useState(current);
  const [to, setTo] = useState(current + 1 < design.pages.length ? current + 1 : 0);
  const fromIndex = Math.min(from, design.pages.length - 1);
  const toIndex = Math.min(to, design.pages.length - 1);

  const rows = design.pages.flatMap((page, fromPage) =>
    (page.transitions ?? []).map((jump) => {
      const toPage = design.pages.findIndex((p) => p.id === jump.toId);
      return { fromPage, toPage, jump, fromId: page.id };
    }),
  );
  rows.sort((a, b) => a.fromPage - b.fromPage || a.toPage - b.toPage);

  return (
    <>
      <h3>Page changes</h3>
      <p className="hint">
        Each jump can have its own animation in the exported webpage. With nothing set, that jump uses a short fade.
      </p>
      <PagePairFields design={design} fromIndex={fromIndex} toIndex={toIndex} onFrom={setFrom} onTo={setTo} />
      {rows.length > 0 ? (
        <ul className="transition-list">
          {rows.map((row) => (
            <li key={`${row.fromId}-${row.jump.toId}`}>
              <button
                type="button"
                className="transition-jump"
                onClick={() => {
                  setFrom(row.fromPage);
                  if (row.toPage >= 0) setTo(row.toPage);
                }}
              >
                {row.fromPage + 1} → {row.toPage + 1}
                <small>{transitionSummary(row.jump)}</small>
              </button>
              <button
                type="button"
                className="transition-clear"
                onClick={() => useDocumentStore.getState().clearPageTransition(row.fromId, row.jump.toId)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export function PagePairFields({
  design,
  fromIndex,
  toIndex,
  onFrom,
  onTo,
}: {
  design: Design;
  fromIndex: number;
  toIndex: number;
  onFrom?: (index: number) => void;
  onTo?: (index: number) => void;
}) {
  const fromPage = design.pages[fromIndex];
  const toPage = design.pages[toIndex];
  const same = !fromPage || !toPage || fromPage.id === toPage.id;
  const rule = !same && fromPage && toPage ? findPageTransition(fromPage, toPage.id) : undefined;
  const resolved = rule ? resolvePageTransition(rule) : null;
  const [open, setOpen] = useState(false);

  function save(
    kind: PageTransitionKind,
    durationMs: number,
    direction?: PageTransitionDirection,
    easing?: PageTransitionEasing,
  ) {
    if (!fromPage || !toPage || fromPage.id === toPage.id) return;
    useDocumentStore.getState().setPageTransition(fromPage.id, toPage.id, kind, durationMs, { direction, easing });
  }

  function choose(kind: PageTransitionKind | "") {
    if (!fromPage || !toPage || fromPage.id === toPage.id) return;
    setOpen(false);
    if (!kind) {
      useDocumentStore.getState().clearPageTransition(fromPage.id, toPage.id);
      return;
    }
    const keepDirection =
      resolved && kindHasDirection(resolved.kind) && kindHasDirection(kind) ? resolved.direction : undefined;
    save(kind, resolved?.durationMs ?? DEFAULT_TRANSITION_MS, keepDirection);
  }

  const currentKind = resolved?.kind ?? "";
  const currentLabel = resolved ? PAGE_TRANSITION_LABELS[resolved.kind] : "Default fade";
  const currentDesc = resolved
    ? PAGE_TRANSITION_DESCRIPTIONS[resolved.kind]
    : "A short fade, used when this jump has no animation of its own.";

  return (
    <>
      {onFrom && onTo ? (
        <div className="field-row">
          <Field label="From">
            <select value={fromIndex} onChange={(e) => onFrom(Number(e.target.value))}>
              {design.pages.map((_, i) => (
                <option key={i} value={i}>
                  Page {i + 1}
                </option>
              ))}
            </select>
          </Field>
          <Field label="To">
            <select value={toIndex} onChange={(e) => onTo(Number(e.target.value))}>
              {design.pages.map((_, i) => (
                <option key={i} value={i}>
                  Page {i + 1}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : (
        <p className="hint">
          Page {fromIndex + 1} → {toIndex + 1}. Other jumps can use a different animation.
        </p>
      )}
      {same ? (
        <p className="hint">Pick two different pages.</p>
      ) : (
        <>
          <Field label="Animation">
            <div className="anim-picker">
              <button type="button" className="anim-current" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                <AnimSwatch kind={currentKind || "fade"} />
                <span>
                  <strong>{currentLabel}</strong>
                  <small>{currentDesc}</small>
                </span>
              </button>
              {open ? (
                <ul className="anim-options">
                  <li>
                    <button type="button" className={currentKind ? "anim-option" : "anim-option on"} onClick={() => choose("")}>
                      <AnimSwatch kind="fade" />
                      <span>
                        <strong>Default fade</strong>
                        <small>A short fade, used when this jump has no animation of its own.</small>
                      </span>
                    </button>
                  </li>
                  {PAGE_TRANSITION_KINDS.map((kind) => (
                    <li key={kind}>
                      <button
                        type="button"
                        className={kind === currentKind ? "anim-option on" : "anim-option"}
                        onClick={() => choose(kind)}
                      >
                        <AnimSwatch kind={kind} />
                        <span>
                          <strong>{PAGE_TRANSITION_LABELS[kind]}</strong>
                          <small>{PAGE_TRANSITION_DESCRIPTIONS[kind]}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Field>
          {resolved && kindHasDirection(resolved.kind) ? (
            <Field label="Direction">
              <div className="seg wrap">
                {PAGE_TRANSITION_DIRECTIONS.map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    className={resolved.direction === dir ? "on" : ""}
                    onClick={() => save(resolved.kind, resolved.durationMs, dir, resolved.easing)}
                  >
                    {DIRECTION_LABELS[dir]}
                  </button>
                ))}
              </div>
            </Field>
          ) : null}
          {resolved && resolved.kind !== "none" ? (
            <Field label="Easing">
              <select
                value={resolved.easing}
                onChange={(e) => {
                  const easing = e.target.value as PageTransitionEasing;
                  if (!(PAGE_TRANSITION_EASINGS as readonly string[]).includes(easing)) return;
                  save(resolved.kind, resolved.durationMs, resolved.direction, easing);
                }}
              >
                {PAGE_TRANSITION_EASINGS.map((easing) => (
                  <option key={easing} value={easing}>
                    {EASING_LABELS[easing]}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label="Duration (ms)">
            <input
              type="number"
              min={0}
              max={2000}
              disabled={!resolved || resolved.kind === "none"}
              value={resolved?.durationMs ?? DEFAULT_TRANSITION_MS}
              onFocus={() => useDocumentStore.getState().beginHistory()}
              onBlur={() => useDocumentStore.getState().endHistory()}
              onChange={(e) => {
                if (!resolved) return;
                save(resolved.kind, Number(e.target.value), resolved.direction, resolved.easing);
              }}
            />
          </Field>
          {resolved?.kind === "none" ? <p className="hint">None snaps. Duration is ignored.</p> : null}
        </>
      )}
    </>
  );
}

function AnimSwatch({ kind }: { kind: string }) {
  return (
    <span className="anim-swatch" data-kind={kind} aria-hidden>
      <i className="a" />
      <i className="b" />
    </span>
  );
}
