import { useState } from "react";
import { Field } from "./ColorField";
import {
  DEFAULT_TRANSITION_MS,
  findPageTransition,
  PAGE_TRANSITION_LABELS,
} from "../lib/pageTransitions";
import { useDocumentStore } from "../store/document";
import { PAGE_TRANSITION_KINDS, type Design, type PageTransitionKind } from "../types";

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
      <PagePairFields
        design={design}
        fromIndex={fromIndex}
        toIndex={toIndex}
        onFrom={setFrom}
        onTo={setTo}
      />
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
                <small>
                  {PAGE_TRANSITION_LABELS[row.jump.kind]} · {row.jump.durationMs}ms
                </small>
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

  function choose(kind: string) {
    if (!fromPage || !toPage || fromPage.id === toPage.id) return;
    if (!kind) {
      useDocumentStore.getState().clearPageTransition(fromPage.id, toPage.id);
      return;
    }
    if (!(PAGE_TRANSITION_KINDS as readonly string[]).includes(kind)) return;
    useDocumentStore.getState().setPageTransition(
      fromPage.id,
      toPage.id,
      kind as PageTransitionKind,
      rule?.durationMs ?? DEFAULT_TRANSITION_MS,
    );
  }

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
            <select value={rule?.kind ?? ""} onChange={(e) => choose(e.target.value)}>
              <option value="">Default fade</option>
              {PAGE_TRANSITION_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {PAGE_TRANSITION_LABELS[kind]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Duration (ms)">
            <input
              type="number"
              min={0}
              max={2000}
              disabled={!rule}
              value={rule?.durationMs ?? DEFAULT_TRANSITION_MS}
              onFocus={() => useDocumentStore.getState().beginHistory()}
              onBlur={() => useDocumentStore.getState().endHistory()}
              onChange={(e) => {
                if (!rule || !fromPage || !toPage) return;
                useDocumentStore.getState().setPageTransition(fromPage.id, toPage.id, rule.kind, Number(e.target.value));
              }}
            />
          </Field>
        </>
      )}
    </>
  );
}
