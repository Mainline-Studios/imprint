import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import type Konva from "konva";
import { Layer, Line, Rect, Stage, Text as KonvaText, Transformer } from "react-konva";
import { ContextMenu } from "../editor/ContextMenu";
import type { ContextMenuItem } from "../editor/ContextMenu";
import { clientToPage } from "../lib/geometry";
import { useDocumentStore } from "../store/document";
import { bakeGroup } from "./bake";
import { ButtonNode } from "./nodes/ButtonNode";
import { ImageNode } from "./nodes/ImageNode";
import { ShapeNode } from "./nodes/ShapeNode";
import { TextNode } from "./nodes/TextNode";
import { EMPTY_GUIDES, type Guides } from "./snap";
import { TextOverlay } from "./TextOverlay";
import { isLightColor, shirtPrintArea, shirtViewOf } from "../lib/shirt";
import { isTshirtSize } from "../templates/presets";
import type { ButtonObject, CanvasObject, TextObject } from "../types";

type CanvasMenu = {
  x: number;
  y: number;
  mode: "object" | "empty";
  pagePoint: { x: number; y: number };
};

export function EditorStage() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const fittedFor = useRef<string | null>(null);
  const panRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [guides, setGuides] = useState<Guides>(EMPTY_GUIDES);
  const [fontsReady, setFontsReady] = useState(false);
  const [menu, setMenu] = useState<CanvasMenu | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);

  const design = useDocumentStore((s) => s.design);
  const pageIndex = useDocumentStore((s) => s.currentPageIndex);
  const selectedIds = useDocumentStore((s) => s.selectedIds);
  const zoom = useDocumentStore((s) => s.zoom);
  const panX = useDocumentStore((s) => s.panX);
  const panY = useDocumentStore((s) => s.panY);
  const spaceDown = useDocumentStore((s) => s.spaceDown);
  const editingTextId = useDocumentStore((s) => s.editingTextId);
  const clipboard = useDocumentStore((s) => s.clipboard);

  const page = design?.pages[pageIndex];

  useEffect(() => {
    void document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setSize({ w, h });
      useDocumentStore.getState().setViewport(w, h);
    });
    ro.observe(el);
    useDocumentStore.getState().setViewport(el.clientWidth, el.clientHeight);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!design || size.h < 80) return;
    if (size.w < 400) {
      if (fittedFor.current === design.id) fittedFor.current = null;
      return;
    }
    if (fittedFor.current === design.id) return;
    fittedFor.current = design.id;
    useDocumentStore.getState().fitToScreen(size.w, size.h);
  }, [design?.id, size.w, size.h, design]);

  useEffect(() => {
    const tr = trRef.current;
    const layer = layerRef.current;
    if (!tr || !layer) return;
    if (editingTextId) {
      tr.nodes([]);
      layer.batchDraw();
      return;
    }
    const nodes = selectedIds
      .map((id) => layer.findOne("#" + id))
      .filter((n): n is Konva.Node => n != null);
    tr.nodes(nodes);
    layer.batchDraw();
  }, [selectedIds, page?.objects, editingTextId, zoom, fontsReady]);

  useEffect(() => {
    setMenu(null);
  }, [zoom, panX, panY, pageIndex, design?.id]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const canvasEl: HTMLDivElement = wrap;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const state = useDocumentStore.getState();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const r = canvasEl.getBoundingClientRect();
      state.setZoom(state.zoom * factor, { x: e.clientX - r.left, y: e.clientY - r.top });
    }

    function onPointerDown(e: PointerEvent) {
      const state = useDocumentStore.getState();
      if (!state.spaceDown && e.button !== 1) return;
      e.preventDefault();
      panRef.current = { x: e.clientX, y: e.clientY, panX: state.panX, panY: state.panY };
      canvasEl.classList.add("grabbing");
    }
    function onPointerMove(e: PointerEvent) {
      const start = panRef.current;
      if (!start) return;
      useDocumentStore.getState().setPan(start.panX + (e.clientX - start.x), start.panY + (e.clientY - start.y));
    }
    function onPointerUp() {
      panRef.current = null;
      canvasEl.classList.remove("grabbing");
    }
    function onNativeContextMenu(e: Event) {
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
    }

    canvasEl.addEventListener("wheel", onWheel, { passive: false });
    canvasEl.addEventListener("pointerdown", onPointerDown);
    canvasEl.addEventListener("contextmenu", onNativeContextMenu);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      canvasEl.removeEventListener("wheel", onWheel);
      canvasEl.removeEventListener("pointerdown", onPointerDown);
      canvasEl.removeEventListener("contextmenu", onNativeContextMenu);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  function openCanvasMenu(clientX: number, clientY: number, target: Konva.Node | null) {
    const wrap = wrapRef.current;
    const state = useDocumentStore.getState();
    if (!wrap || state.spaceDown) return;
    const pagePoint = clientToPage(clientX, clientY, wrap, state.panX, state.panY, state.zoom);
    const hit = target ? contextHit(target) : { mode: "empty" as const };
    if (hit.mode === "object") {
      if (!state.selectedIds.includes(hit.id)) state.select([hit.id]);
      setMenu({ x: clientX, y: clientY, mode: "object", pagePoint });
      return;
    }
    if (hit.mode === "transformer" && state.selectedIds.length > 0) {
      setMenu({ x: clientX, y: clientY, mode: "object", pagePoint });
      return;
    }
    setMenu({ x: clientX, y: clientY, mode: "empty", pagePoint });
  }

  function onWrapContextMenu(e: MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (isTypingTarget(e.target)) return;
    const stage = stageRef.current;
    let target: Konva.Node | null = null;
    if (stage) {
      const rect = stage.container().getBoundingClientRect();
      target = stage.getIntersection({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    openCanvasMenu(e.clientX, e.clientY, target);
  }

  if (!design || !page) {
    return <div className="canvas-wrap" ref={wrapRef} onContextMenu={onWrapContextMenu} />;
  }

  const editingObj = page.objects.find(
    (o): o is TextObject | ButtonObject => o.id === editingTextId && (o.type === "text" || o.type === "button"),
  );
  const keepRatio = selectedIds.length === 1 && page.objects.find((o) => o.id === selectedIds[0])?.type === "image";
  const tshirt = isTshirtSize(design.width, design.height);
  const shirtView = shirtViewOf(page, pageIndex);
  const printArea = tshirt ? shirtPrintArea(shirtView, design.width, design.height) : null;
  const printStroke = isLightColor(page.background) ? "#7a2e2e" : "#c4a574";

  return (
    <div
      ref={wrapRef}
      className={spaceDown ? "canvas-wrap space" : "canvas-wrap"}
      onContextMenu={onWrapContextMenu}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        e.preventDefault();
        const raw = e.dataTransfer.getData("application/imprint");
        const point = clientToPage(e.clientX, e.clientY, e.currentTarget, panX, panY, zoom);
        if (raw) {
          const spec = JSON.parse(raw) as {
            kind: "text" | "shape" | "button";
            variant?: "heading" | "subheading" | "body";
            shape?: "rect" | "ellipse" | "triangle" | "line";
          };
          if (spec.kind === "text" && spec.variant) {
            useDocumentStore.getState().addAt({ kind: "text", variant: spec.variant }, point);
          } else if (spec.kind === "shape" && spec.shape) {
            useDocumentStore.getState().addAt({ kind: "shape", shape: spec.shape }, point);
          } else if (spec.kind === "button") {
            useDocumentStore.getState().addAt({ kind: "button" }, point);
          }
          return;
        }
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
          void useDocumentStore.getState().addImageFile(file, point);
        }
      }}
    >
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        scaleX={zoom}
        scaleY={zoom}
        x={panX}
        y={panY}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          e.evt.stopPropagation();
          openCanvasMenu(e.evt.clientX, e.evt.clientY, e.target);
        }}
        onMouseDown={(e) => {
          if (useDocumentStore.getState().spaceDown) return;
          const name = e.target.name();
          if (name === "page-bg" || name === "pasteboard" || e.target === e.target.getStage()) {
            if (!e.evt.shiftKey) useDocumentStore.getState().clearSelection();
          }
        }}
      >
        <Layer ref={layerRef} listening>
          <Rect
            name="pasteboard"
            x={-8000}
            y={-8000}
            width={16000}
            height={16000}
            fill="#00000000"
            listening
          />
          <Rect
            x={0}
            y={0}
            width={design.width}
            height={design.height}
            fill={page.background}
            shadowColor="rgba(26,22,20,0.28)"
            shadowBlur={24 / zoom}
            shadowOpacity={1}
            listening={false}
          />
          <Rect
            name="page-bg"
            x={0}
            y={0}
            width={design.width}
            height={design.height}
            fill={page.background}
            listening
          />
          {page.objects.map((obj) => renderNode(obj, setGuides))}
          {printArea && (
            <>
              <Rect
                x={printArea.x}
                y={printArea.y}
                width={printArea.width}
                height={printArea.height}
                stroke={printStroke}
                strokeWidth={2 / zoom}
                dash={[10 / zoom, 7 / zoom]}
                fillEnabled={false}
                listening={false}
              />
              <KonvaText
                x={printArea.x + 10}
                y={printArea.y + 8}
                text="Print area"
                fontSize={22}
                fontFamily="Inter, system-ui, sans-serif"
                fill={printStroke}
                opacity={0.75}
                listening={false}
              />
            </>
          )}
          {guides.v.map((x) => (
            <Line key={"v" + x} points={[x, -40, x, design.height + 40]} stroke="#c45c26" strokeWidth={1 / zoom} listening={false} />
          ))}
          {guides.h.map((y) => (
            <Line key={"h" + y} points={[-40, y, design.width + 40, y]} stroke="#c45c26" strokeWidth={1 / zoom} listening={false} />
          ))}
          <Transformer
            ref={trRef}
            rotateEnabled
            keepRatio={keepRatio}
            ignoreStroke
            anchorStroke="#1a1614"
            anchorFill="#f6f1e8"
            anchorSize={8}
            borderStroke="#7a2e2e"
            borderStrokeWidth={1}
            rotateAnchorOffset={18}
            boundBoxFunc={(oldBox, newBox) => {
              if (Math.abs(newBox.width) < 8 || Math.abs(newBox.height) < 8) return oldBox;
              return newBox;
            }}
            onTransformStart={() => useDocumentStore.getState().beginHistory()}
            onTransformEnd={() => {
              const tr = trRef.current;
              const layer = layerRef.current;
              const state = useDocumentStore.getState();
              const current = state.design?.pages[state.currentPageIndex];
              if (!tr || !layer || !current) {
                state.endHistory();
                return;
              }
              for (const node of tr.nodes()) {
                const obj = current.objects.find((o) => o.id === node.id());
                if (!obj) continue;
                const patch = bakeGroup(node as Konva.Group, obj);
                state.updateObject(obj.id, patch, { record: false });
              }
              state.endHistory();
            }}
          />
        </Layer>
      </Stage>
      {editingObj && (
        <TextOverlay obj={editingObj} stage={stageRef.current} container={wrapRef.current} />
      )}
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={canvasMenuItems(menu, clipboard)} onClose={closeMenu} />
      )}
    </div>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function contextHit(
  target: Konva.Node,
): { mode: "object"; id: string } | { mode: "transformer" } | { mode: "empty" } {
  let node: Konva.Node | null = target;
  while (node) {
    if (node.getClassName() === "Transformer") return { mode: "transformer" };
    if (node.name() === "object") return { mode: "object", id: node.id() };
    node = node.getParent();
  }
  return { mode: "empty" };
}

function canvasMenuItems(menu: CanvasMenu, clipboard: CanvasObject[] | null): ContextMenuItem[] {
  const state = useDocumentStore.getState();
  const at = menu.pagePoint;
  const canPaste = clipboard != null && clipboard.length > 0;
  if (menu.mode === "empty") {
    return [
      { type: "item", label: "Paste", disabled: !canPaste, onSelect: () => state.pasteClipboard(at) },
      { type: "item", label: "Add heading", onSelect: () => state.addAt({ kind: "text", variant: "heading" }, at) },
      { type: "item", label: "Add button", onSelect: () => state.addAt({ kind: "button" }, at) },
      { type: "item", label: "Add rectangle", onSelect: () => state.addAt({ kind: "shape", shape: "rect" }, at) },
    ];
  }
  return [
    { type: "item", label: "Duplicate", onSelect: () => state.duplicateSelected() },
    { type: "item", label: "Copy", onSelect: () => state.copySelected() },
    { type: "item", label: "Paste", disabled: !canPaste, onSelect: () => state.pasteClipboard(at) },
    { type: "item", label: "Delete", onSelect: () => state.deleteSelected() },
    { type: "separator" },
    { type: "item", label: "Bring to front", onSelect: () => state.bringToFront() },
    { type: "item", label: "Send to back", onSelect: () => state.sendToBack() },
    { type: "item", label: "Bring forward", onSelect: () => state.bringForward() },
    { type: "item", label: "Send backward", onSelect: () => state.sendBackward() },
  ];
}

function renderNode(obj: CanvasObject, onGuides: (g: Guides) => void) {
  if (obj.type === "text") {
    return (
      <TextNode
        key={obj.id}
        obj={obj}
        onGuides={onGuides}
        onEdit={() => useDocumentStore.getState().setEditingText(obj.id)}
      />
    );
  }
  if (obj.type === "image") {
    return <ImageNode key={obj.id} obj={obj} onGuides={onGuides} />;
  }
  if (obj.type === "button") {
    return (
      <ButtonNode
        key={obj.id}
        obj={obj}
        onGuides={onGuides}
        onEdit={() => useDocumentStore.getState().setEditingText(obj.id)}
      />
    );
  }
  return <ShapeNode key={obj.id} obj={obj} onGuides={onGuides} />;
}
