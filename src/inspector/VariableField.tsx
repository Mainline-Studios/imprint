import { useLayoutEffect, useRef } from "react";
import { POINTS_LABEL, POINTS_TOKEN, serializeVariableEditor, variableEditorHtml } from "../lib/variables";

export function VariableEditor({
  value,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  className,
  style,
  showInsert = true,
  inputRef,
  onPointerDown,
}: {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  showInsert?: boolean;
  inputRef?: React.RefObject<HTMLDivElement | null>;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef(value);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el && serializeVariableEditor(el) === value) {
      last.current = value;
      return;
    }
    if (serializeVariableEditor(el) !== value) el.innerHTML = variableEditorHtml(value);
    last.current = value;
  }, [value]);

  function commit() {
    const el = ref.current;
    if (!el) return;
    const next = serializeVariableEditor(el);
    if ((el.textContent ?? "").includes(POINTS_TOKEN)) el.innerHTML = variableEditorHtml(next);
    last.current = next;
    if (next !== value) onChange(next);
  }

  function insertChip() {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const chip = document.createElement("span");
    chip.className = "var-chip";
    chip.contentEditable = "false";
    chip.dataset.var = "points";
    chip.textContent = POINTS_LABEL;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(chip);
      range.setStartAfter(chip);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      el.appendChild(chip);
    }
    const next = serializeVariableEditor(el);
    last.current = next;
    onChange(next);
  }

  return (
    <>
      <div
        ref={(node) => {
          ref.current = node;
          if (inputRef) inputRef.current = node;
        }}
        onPointerDown={onPointerDown}
        className={className ? `var-editor ${className}` : "var-editor"}
        style={style}
        contentEditable
        role="textbox"
        aria-multiline
        aria-label="Text"
        suppressContentEditableWarning
        onFocus={onFocus}
        onBlur={() => {
          commit();
          onBlur?.();
        }}
        onInput={commit}
        onKeyDown={onKeyDown}
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData("text/plain");
          const el = ref.current;
          if (!el) return;
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0) return;
          const range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(text));
          range.collapse(false);
          commit();
        }}
      />
      {showInsert ? (
        <div className="var-tools">
          <button type="button" className="var-insert" onMouseDown={(event) => event.preventDefault()} onClick={insertChip}>
            {POINTS_LABEL}
          </button>
          <span className="hint">Adds the score. The box fills in when someone takes the quiz.</span>
        </div>
      ) : null}
    </>
  );
}

export function PointsChip() {
  return <span className="var-chip">{POINTS_LABEL}</span>;
}
