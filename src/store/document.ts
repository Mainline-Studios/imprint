import { create } from "zustand";
import { blobFromFile, loadAssetImage } from "../assets/cache";
import { cloneDesign, cloneObject, clonePage, remapGroupIds, scalePage } from "../lib/clone";
import { clamp } from "../lib/geometry";
import { uuid } from "../lib/ids";
import { createButton, createImageObject, createShape, createSticker, createText } from "../lib/objects";
import {
  DEFAULT_SHIRT_COLOR,
  SHIRT_VIEWS,
  canDeleteShirtPage,
  emptyShirtPage,
  ensureShirtDesign,
} from "../lib/shirt";
import { isHtmlCanvas, isTshirtSize } from "../templates/presets";
import { getDesign, listAssets } from "../persist/db";
import { persistAsset } from "../persist/assets";
import { loadBrandColors, saveBrandColors } from "../persist/brand";
import { hydrateDesigns, removeDesign, saveDesign } from "../persist/save";
import { templateById } from "../templates/catalog";
import { fontOf } from "../fonts/catalog";
import { textVisualHeight } from "../text/effects";
import type {
  AssetRecord,
  CanvasObject,
  Design,
  Fill,
  FontFamily,
  Page,
  ShapeKind,
  SidebarTab,
  Snapshot,
  TextObject,
  View,
} from "../types";

const HISTORY_LIMIT = 50;

function snapshotOf(design: Design, currentPageIndex: number, selectedIds: string[]): Snapshot {
  return {
    name: design.name,
    width: design.width,
    height: design.height,
    pages: structuredClone(design.pages),
    currentPageIndex,
    selectedIds: [...selectedIds],
    ...(design.shirt ? { shirt: { ...design.shirt } } : {}),
    ...(design.brandColors ? { brandColors: [...design.brandColors] } : {}),
    ...(design.folder ? { folder: design.folder } : {}),
  };
}

function applySnapshot(design: Design, snap: Snapshot): Design {
  const next: Design = {
    ...design,
    name: snap.name,
    width: snap.width,
    height: snap.height,
    pages: structuredClone(snap.pages),
    updatedAt: Date.now(),
  };
  if (snap.shirt) next.shirt = { ...snap.shirt };
  else delete next.shirt;
  if (snap.brandColors) next.brandColors = [...snap.brandColors];
  else delete next.brandColors;
  if (snap.folder) next.folder = snap.folder;
  else delete next.folder;
  return next;
}

function touch(design: Design, pages?: Page[]): Design {
  return {
    ...design,
    pages: pages ?? design.pages,
    updatedAt: Date.now(),
  };
}

function mapPage(design: Design, index: number, fn: (page: Page) => Page): Design {
  return touch(
    design,
    design.pages.map((page, i) => (i === index ? fn(page) : page)),
  );
}

type AddKind =
  | { kind: "text"; variant: "heading" | "subheading" | "body"; fontFamily?: FontFamily }
  | { kind: "shape"; shape: ShapeKind }
  | { kind: "button" }
  | { kind: "sticker"; sticker: string };

type UpdateOpts = { record?: boolean };

function expandGroupSelection(ids: string[], page: Page | undefined, additive?: boolean): string[] {
  if (additive || !page || ids.length !== 1) return ids;
  const obj = page.objects.find((o) => o.id === ids[0]);
  if (!obj?.groupId) return ids;
  return page.objects.filter((o) => o.groupId === obj.groupId).map((o) => o.id);
}

function unlockedIds(page: Page, ids: string[]): string[] {
  return ids.filter((id) => {
    const obj = page.objects.find((o) => o.id === id);
    return obj != null && !obj.locked;
  });
}

export type DocumentState = {
  view: View;
  designs: Design[];
  assets: AssetRecord[];
  design: Design | null;
  currentPageIndex: number;
  selectedIds: string[];
  zoom: number;
  panX: number;
  panY: number;
  viewportW: number;
  viewportH: number;
  spaceDown: boolean;
  sidebarTab: SidebarTab;
  editingTextId: string | null;
  editingSelectAll: boolean;
  grouping: boolean;
  past: Snapshot[];
  future: Snapshot[];
  clipboard: CanvasObject[] | null;
  pasteCount: number;
  savedAt: number | null;
  createOpen: boolean;
  exportOpen: boolean;
  exporting: boolean;
  presenting: boolean;
  brandDefaults: string[];

  loadHome: () => Promise<void>;
  setCreateOpen: (open: boolean) => void;
  setExportOpen: (open: boolean) => void;
  setExporting: (v: boolean) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setSpaceDown: (v: boolean) => void;
  setViewport: (w: number, h: number) => void;
  setPan: (x: number, y: number) => void;
  setZoom: (zoom: number, around?: { x: number; y: number }) => void;
  fitToScreen: (cw?: number, ch?: number) => void;

  createBlank: (width: number, height: number, name?: string) => Promise<void>;
  createFromTemplate: (templateId: string) => Promise<void>;
  createFromImageFile: (file: File) => Promise<void>;
  openDesign: (id: string) => Promise<void>;
  closeToHome: () => Promise<void>;
  deleteDesign: (id: string) => Promise<void>;
  duplicateDesign: (id: string) => Promise<void>;
  renameListed: (id: string, name: string) => Promise<void>;

  setName: (name: string) => void;
  resizeCanvas: (width: number, height: number) => void;
  setBackground: (fill: Fill) => void;
  setShirtColor: (color: string, opts?: UpdateOpts) => void;
  setBrandColors: (colors: string[]) => void;
  setBrandDefaults: (colors: string[]) => Promise<void>;
  setDesignFolder: (folder: string | undefined) => void;
  setListedFolder: (id: string, folder: string | undefined) => Promise<void>;
  renameFolder: (from: string, to: string) => Promise<void>;
  setPresenting: (v: boolean) => void;

  select: (ids: string[], additive?: boolean) => void;
  clearSelection: () => void;
  setEditingText: (id: string | null, opts?: { selectAll?: boolean }) => void;

  beginHistory: () => void;
  endHistory: () => void;
  undo: () => void;
  redo: () => void;

  updateObject: (id: string, patch: Partial<CanvasObject>, opts?: UpdateOpts) => void;
  updateSelected: (patch: Partial<CanvasObject>, opts?: UpdateOpts) => void;
  nudgeSelected: (dx: number, dy: number) => void;
  addObject: (obj: CanvasObject) => void;
  addAt: (spec: AddKind, at?: { x: number; y: number }) => void;
  addImageFile: (file: File, at?: { x: number; y: number }) => Promise<void>;
  placeAsset: (assetId: string, at?: { x: number; y: number }) => Promise<void>;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  pasteClipboard: (at?: { x: number; y: number }) => void;
  bringToFront: () => void;
  sendToBack: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  alignOnPage: (edge: "left" | "center" | "right" | "top" | "middle" | "bottom") => void;
  lockSelected: () => void;
  unlockSelected: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  setObjectVisible: (id: string, visible: boolean) => void;

  addPage: () => void;
  duplicatePage: () => void;
  deletePage: () => void;
  setPageIndex: (index: number) => void;
  reorderPages: (from: number, to: number) => void;
  applyTemplateToPage: (templateId: string) => void;
};

export const useDocumentStore = create<DocumentState>((set, get) => {
  function currentDesign(): Design | null {
    return get().design;
  }

  function pushHistory(): void {
    const { design, currentPageIndex, selectedIds, past, grouping } = get();
    if (!design || grouping) return;
    set({
      past: [...past.slice(-(HISTORY_LIMIT - 1)), snapshotOf(design, currentPageIndex, selectedIds)],
      future: [],
    });
  }

  function commit(design: Design, extra?: Partial<DocumentState>): void {
    set({ design: touch(design), ...extra });
  }

  function withPage(fn: (page: Page) => Page, extra?: Partial<DocumentState>): void {
    const { design, currentPageIndex } = get();
    if (!design) return;
    commit(mapPage(design, currentPageIndex, fn), extra);
  }

  return {
    view: "home",
    designs: [],
    assets: [],
    design: null,
    currentPageIndex: 0,
    selectedIds: [],
    zoom: 0.5,
    panX: 40,
    panY: 40,
    viewportW: 800,
    viewportH: 600,
    spaceDown: false,
    sidebarTab: "templates",
    editingTextId: null,
    editingSelectAll: true,
    grouping: false,
    past: [],
    future: [],
    clipboard: null,
    pasteCount: 0,
    savedAt: null,
    createOpen: false,
    exportOpen: false,
    exporting: false,
    presenting: false,
    brandDefaults: [],

    loadHome: async () => {
      const [designs, assets, brand] = await Promise.all([hydrateDesigns(), listAssets(), loadBrandColors()]);
      set({ designs, assets, brandDefaults: brand });
    },

    setCreateOpen: (open) => set({ createOpen: open }),
    setExportOpen: (open) => set({ exportOpen: open }),
    setExporting: (v) => set({ exporting: v }),
    setSidebarTab: (tab) => set({ sidebarTab: tab }),
    setSpaceDown: (v) => set({ spaceDown: v }),
    setViewport: (w, h) => set({ viewportW: w, viewportH: h }),
    setPan: (x, y) => set({ panX: x, panY: y }),

    setZoom: (next, around) => {
      const { zoom, panX, panY, viewportW, viewportH } = get();
      const z = clamp(next, 0.1, 4);
      const cx = around?.x ?? viewportW / 2;
      const cy = around?.y ?? viewportH / 2;
      const pageX = (cx - panX) / zoom;
      const pageY = (cy - panY) / zoom;
      set({
        zoom: z,
        panX: cx - pageX * z,
        panY: cy - pageY * z,
      });
    },

    fitToScreen: (cw, ch) => {
      const { design, viewportW, viewportH } = get();
      if (!design) return;
      const w = cw ?? viewportW;
      const h = ch ?? viewportH;
      const pad = 64;
      const zoom = Math.max(0.08, Math.min((w - pad * 2) / design.width, (h - pad * 2) / design.height));
      set({
        zoom,
        panX: (w - design.width * zoom) / 2,
        panY: (h - design.height * zoom) / 2,
      });
    },

    createBlank: async (width, height, name = "Untitled") => {
      const html = isHtmlCanvas(width, height);
      const tshirt = isTshirtSize(width, height);
      const canvas = { width, height };
      const heading = html ? createText(canvas, "heading") : null;
      const starter = html ? createButton(canvas) : null;
      if (heading) {
        heading.text = "Your headline";
        heading.y = height * 0.32;
      }
      if (heading && starter) {
        starter.y = heading.y + heading.fontSize * 1.6 + 28;
      }
      const design: Design = {
        id: uuid(),
        name,
        width,
        height,
        updatedAt: Date.now(),
        pages: tshirt
          ? SHIRT_VIEWS.map((role) => emptyShirtPage(role))
          : [{ id: uuid(), background: "#ffffff", objects: [heading, starter].filter((o) => o != null) }],
        ...(tshirt ? { shirt: { color: DEFAULT_SHIRT_COLOR, neck: "crew" as const } } : {}),
        ...(get().brandDefaults.length ? { brandColors: [...get().brandDefaults] } : {}),
      };
      await saveDesign(design);
      set({
        view: "editor",
        design,
        currentPageIndex: 0,
        selectedIds: starter ? [starter.id] : [],
        past: [],
        future: [],
        editingTextId: null,
        createOpen: false,
        sidebarTab: html ? "elements" : "templates",
        savedAt: design.updatedAt,
      });
    },

    createFromTemplate: async (templateId) => {
      const tpl = templateById(templateId);
      if (!tpl) return;
      const design = ensureShirtDesign({
        id: uuid(),
        name: tpl.name,
        width: tpl.width,
        height: tpl.height,
        updatedAt: Date.now(),
        pages: tpl.build(),
        ...(get().brandDefaults.length ? { brandColors: [...get().brandDefaults] } : {}),
      });
      await saveDesign(design);
      set({
        view: "editor",
        design,
        currentPageIndex: 0,
        selectedIds: [],
        past: [],
        future: [],
        editingTextId: null,
        createOpen: false,
        sidebarTab: tpl.category === "site" || tpl.category === "email" ? "elements" : "templates",
        savedAt: design.updatedAt,
      });
    },

    createFromImageFile: async (file) => {
      const { blob, width, height } = await blobFromFile(file);
      const asset: AssetRecord = {
        id: uuid(),
        blob,
        mime: blob.type || file.type || "image/jpeg",
        name: file.name,
        createdAt: Date.now(),
      };
      await persistAsset(asset);
      await loadAssetImage(asset.id);
      const stem = file.name.replace(/\.[^.]+$/, "").trim();
      const design: Design = {
        id: uuid(),
        name: stem || "Untitled",
        width,
        height,
        updatedAt: Date.now(),
        pages: [
          {
            id: uuid(),
            background: "#ffffff",
            objects: [
              {
                id: uuid(),
                type: "image",
                x: 0,
                y: 0,
                width,
                height,
                rotation: 0,
                assetId: asset.id,
                opacity: 1,
              },
            ],
          },
        ],
      };
      await saveDesign(design);
      set({
        view: "editor",
        design,
        currentPageIndex: 0,
        selectedIds: [],
        past: [],
        future: [],
        editingTextId: null,
        createOpen: false,
        savedAt: design.updatedAt,
        assets: await listAssets(),
      });
    },

    openDesign: async (id) => {
      const found = await getDesign(id);
      if (!found) return;
      const design = ensureShirtDesign(structuredClone(found));
      set({
        view: "editor",
        design,
        currentPageIndex: 0,
        selectedIds: [],
        past: [],
        future: [],
        editingTextId: null,
        savedAt: found.updatedAt,
      });
    },

    closeToHome: async () => {
      const { design } = get();
      if (design) await saveDesign({ ...design, updatedAt: Date.now() });
      const designs = await hydrateDesigns();
      set({
        view: "home",
        design: null,
        designs,
        selectedIds: [],
        past: [],
        future: [],
        editingTextId: null,
        exportOpen: false,
      });
    },

    deleteDesign: async (id) => {
      await removeDesign(id);
      const designs = await hydrateDesigns();
      const { design } = get();
      if (design?.id === id) {
        set({ view: "home", design: null, designs, selectedIds: [], past: [], future: [] });
      } else {
        set({ designs });
      }
    },

    duplicateDesign: async (id) => {
      const found = get().designs.find((d) => d.id === id) ?? (await getDesign(id));
      if (!found) return;
      const copy = cloneDesign(found);
      await saveDesign(copy);
      set({ designs: await hydrateDesigns() });
    },

    renameListed: async (id, name) => {
      const found = await getDesign(id);
      if (!found) return;
      await saveDesign({ ...found, name, updatedAt: Date.now() });
      set({ designs: await hydrateDesigns() });
    },

    setName: (name) => {
      const design = currentDesign();
      if (!design) return;
      pushHistory();
      commit({ ...design, name });
    },

    resizeCanvas: (width, height) => {
      const design = currentDesign();
      if (!design) return;
      pushHistory();
      commit(ensureShirtDesign({ ...design, width, height }));
    },

    setBackground: (fill) => {
      pushHistory();
      withPage((page) => ({ ...page, background: fill }));
    },

    setShirtColor: (color, opts) => {
      const design = currentDesign();
      if (!design) return;
      const record = opts?.record ?? !get().grouping;
      if (record) pushHistory();
      commit({
        ...design,
        shirt: { neck: "crew", ...design.shirt, color },
      });
    },

    setBrandColors: (colors) => {
      const design = currentDesign();
      if (!design) return;
      pushHistory();
      commit({ ...design, brandColors: colors.slice(0, 24) });
    },

    setBrandDefaults: async (colors) => {
      const next = colors.slice(0, 24);
      set({ brandDefaults: next });
      await saveBrandColors(next);
    },

    setDesignFolder: (folder) => {
      const design = currentDesign();
      if (!design) return;
      const next = { ...design };
      if (folder) next.folder = folder.slice(0, 80);
      else delete next.folder;
      commit(next);
    },

    setListedFolder: async (id, folder) => {
      const found = await getDesign(id);
      if (!found) return;
      const next = { ...found, updatedAt: Date.now() };
      if (folder) next.folder = folder.slice(0, 80);
      else delete next.folder;
      await saveDesign(next);
      const { design } = get();
      set({
        designs: await hydrateDesigns(),
        ...(design?.id === id ? { design: { ...design, folder: next.folder } } : {}),
      });
    },

    renameFolder: async (from, to) => {
      const name = to.trim().slice(0, 80);
      if (!from || !name || from === name) return;
      const { designs, design } = get();
      for (const d of designs) {
        if (d.folder !== from) continue;
        const next = { ...d, folder: name, updatedAt: Date.now() };
        await saveDesign(next);
      }
      set({
        designs: await hydrateDesigns(),
        ...(design?.folder === from ? { design: { ...design, folder: name } } : {}),
      });
    },

    setPresenting: (v) => set({ presenting: v }),

    select: (ids, additive) => {
      const { design, currentPageIndex } = get();
      const page = design?.pages[currentPageIndex];
      const nextIds = expandGroupSelection(ids, page, additive);
      if (additive) {
        const current = new Set(get().selectedIds);
        for (const id of nextIds) {
          if (current.has(id)) current.delete(id);
          else current.add(id);
        }
        set({ selectedIds: [...current], editingTextId: null });
        return;
      }
      set({ selectedIds: nextIds, editingTextId: null });
    },

    clearSelection: () => set({ selectedIds: [], editingTextId: null }),

    setEditingText: (id, opts) =>
      set({
        editingTextId: id,
        editingSelectAll: opts?.selectAll ?? true,
        selectedIds: id ? [id] : get().selectedIds,
      }),

    beginHistory: () => {
      if (get().grouping) return;
      const { design, currentPageIndex, selectedIds, past } = get();
      if (!design) return;
      set({
        grouping: true,
        past: [...past.slice(-(HISTORY_LIMIT - 1)), snapshotOf(design, currentPageIndex, selectedIds)],
        future: [],
      });
    },

    endHistory: () => set({ grouping: false }),

    undo: () => {
      const { design, past, future, currentPageIndex, selectedIds } = get();
      if (!design || past.length === 0) return;
      const prev = past[past.length - 1];
      set({
        design: applySnapshot(design, prev),
        currentPageIndex: prev.currentPageIndex,
        selectedIds: prev.selectedIds,
        past: past.slice(0, -1),
        future: [...future, snapshotOf(design, currentPageIndex, selectedIds)],
        editingTextId: null,
        grouping: false,
      });
    },

    redo: () => {
      const { design, past, future, currentPageIndex, selectedIds } = get();
      if (!design || future.length === 0) return;
      const next = future[future.length - 1];
      set({
        design: applySnapshot(design, next),
        currentPageIndex: next.currentPageIndex,
        selectedIds: next.selectedIds,
        future: future.slice(0, -1),
        past: [...past, snapshotOf(design, currentPageIndex, selectedIds)],
        editingTextId: null,
        grouping: false,
      });
    },

    updateObject: (id, patch, opts) => {
      const record = opts?.record ?? !get().grouping;
      if (record) pushHistory();
      withPage((page) => ({
        ...page,
        objects: page.objects.map((obj) => (obj.id === id ? ({ ...obj, ...patch } as CanvasObject) : obj)),
      }));
    },

    updateSelected: (patch, opts) => {
      const { selectedIds } = get();
      const record = opts?.record ?? !get().grouping;
      if (record) pushHistory();
      withPage((page) => ({
        ...page,
        objects: page.objects.map((obj) =>
          selectedIds.includes(obj.id) ? ({ ...obj, ...patch } as CanvasObject) : obj,
        ),
      }));
    },

    nudgeSelected: (dx, dy) => {
      const { selectedIds, editingTextId, design, currentPageIndex } = get();
      if (editingTextId) return;
      if (selectedIds.length === 0) return;
      if (dx === 0 && dy === 0) return;
      const page = design?.pages[currentPageIndex];
      if (!page) return;
      const moving = unlockedIds(page, selectedIds);
      if (moving.length === 0) return;
      pushHistory();
      withPage((p) => ({
        ...p,
        objects: p.objects.map((obj) =>
          moving.includes(obj.id) ? { ...obj, x: obj.x + dx, y: obj.y + dy } : obj,
        ),
      }));
    },

    addObject: (obj) => {
      pushHistory();
      withPage((page) => ({ ...page, objects: [...page.objects, obj] }), {
        selectedIds: [obj.id],
        editingTextId: null,
      });
    },

    addAt: (spec, at) => {
      const design = currentDesign();
      if (!design) return;
      const canvas = { width: design.width, height: design.height };
      const obj =
        spec.kind === "text"
          ? createText(canvas, spec.variant, at, spec.fontFamily)
          : spec.kind === "button"
            ? createButton(canvas, at)
            : spec.kind === "sticker"
              ? createSticker(canvas, spec.sticker, at)
              : createShape(canvas, spec.shape, at);
      get().addObject(obj);
      if (spec.kind === "text") set({ editingTextId: null });
    },

    addImageFile: async (file, at) => {
      const design = currentDesign();
      if (!design) return;
      const { blob, width, height } = await blobFromFile(file);
      const asset: AssetRecord = {
        id: uuid(),
        blob,
        mime: blob.type || file.type || "image/jpeg",
        name: file.name,
        createdAt: Date.now(),
      };
      await persistAsset(asset);
      await loadAssetImage(asset.id);
      const obj = createImageObject({ width: design.width, height: design.height }, asset.id, { width, height }, at);
      get().addObject(obj);
      set({ assets: await listAssets() });
    },

    placeAsset: async (assetId, at) => {
      const design = currentDesign();
      if (!design) return;
      const img = await loadAssetImage(assetId);
      const obj = createImageObject(
        { width: design.width, height: design.height },
        assetId,
        { width: img.naturalWidth, height: img.naturalHeight },
        at,
      );
      get().addObject(obj);
    },

    deleteSelected: () => {
      const { selectedIds, editingTextId, design, currentPageIndex } = get();
      if (editingTextId) return;
      if (selectedIds.length === 0) return;
      const page = design?.pages[currentPageIndex];
      if (!page) return;
      const removing = unlockedIds(page, selectedIds);
      if (removing.length === 0) return;
      pushHistory();
      withPage(
        (p) => ({
          ...p,
          objects: p.objects.filter((o) => !removing.includes(o.id)),
        }),
        { selectedIds: selectedIds.filter((id) => !removing.includes(id)) },
      );
    },

    duplicateSelected: () => {
      const { selectedIds, design, currentPageIndex } = get();
      if (!design || selectedIds.length === 0) return;
      const page = design.pages[currentPageIndex];
      const copies = remapGroupIds(
        page.objects.filter((o) => selectedIds.includes(o.id)).map((o) => cloneObject(o, 24, 24)),
      );
      if (copies.length === 0) return;
      pushHistory();
      withPage((p) => ({ ...p, objects: [...p.objects, ...copies] }), {
        selectedIds: copies.map((c) => c.id),
      });
    },

    copySelected: () => {
      const { selectedIds, design, currentPageIndex } = get();
      if (!design || selectedIds.length === 0) return;
      const page = design.pages[currentPageIndex];
      set({
        clipboard: page.objects.filter((o) => selectedIds.includes(o.id)).map((o) => cloneObject(o, 0, 0)),
        pasteCount: 0,
      });
    },

    pasteClipboard: (at) => {
      const { clipboard, pasteCount } = get();
      if (!clipboard || clipboard.length === 0) return;
      const n = pasteCount + 1;
      let dx = 24 * n;
      let dy = 24 * n;
      if (at) {
        dx = at.x - Math.min(...clipboard.map((o) => o.x));
        dy = at.y - Math.min(...clipboard.map((o) => o.y));
      }
      const copies = remapGroupIds(clipboard.map((o) => cloneObject(o, dx, dy)));
      pushHistory();
      withPage((p) => ({ ...p, objects: [...p.objects, ...copies] }), {
        selectedIds: copies.map((c) => c.id),
        pasteCount: n,
      });
    },

    bringToFront: () => {
      const { selectedIds } = get();
      if (selectedIds.length === 0) return;
      pushHistory();
      withPage((page) => {
        const moving = page.objects.filter((o) => selectedIds.includes(o.id));
        const rest = page.objects.filter((o) => !selectedIds.includes(o.id));
        return { ...page, objects: [...rest, ...moving] };
      });
    },

    sendToBack: () => {
      const { selectedIds } = get();
      if (selectedIds.length === 0) return;
      pushHistory();
      withPage((page) => {
        const moving = page.objects.filter((o) => selectedIds.includes(o.id));
        const rest = page.objects.filter((o) => !selectedIds.includes(o.id));
        return { ...page, objects: [...moving, ...rest] };
      });
    },

    bringForward: () => {
      const { selectedIds } = get();
      if (selectedIds.length === 0) return;
      pushHistory();
      withPage((page) => {
        const objects = [...page.objects];
        for (let i = objects.length - 2; i >= 0; i--) {
          if (selectedIds.includes(objects[i].id) && !selectedIds.includes(objects[i + 1].id)) {
            [objects[i], objects[i + 1]] = [objects[i + 1], objects[i]];
          }
        }
        return { ...page, objects };
      });
    },

    sendBackward: () => {
      const { selectedIds } = get();
      if (selectedIds.length === 0) return;
      pushHistory();
      withPage((page) => {
        const objects = [...page.objects];
        for (let i = 1; i < objects.length; i++) {
          if (selectedIds.includes(objects[i].id) && !selectedIds.includes(objects[i - 1].id)) {
            [objects[i], objects[i - 1]] = [objects[i - 1], objects[i]];
          }
        }
        return { ...page, objects };
      });
    },

    alignOnPage: (edge) => {
      const { design, selectedIds } = get();
      if (!design || selectedIds.length === 0) return;
      pushHistory();
      withPage((p) => ({
        ...p,
        objects: p.objects.map((obj) => {
          if (!selectedIds.includes(obj.id)) return obj;
          const h = obj.type === "text" ? textVisualHeight(obj) : obj.height;
          if (edge === "left") return { ...obj, x: 0 };
          if (edge === "center") return { ...obj, x: (design.width - obj.width) / 2 };
          if (edge === "right") return { ...obj, x: design.width - obj.width };
          if (edge === "top") return { ...obj, y: 0 };
          if (edge === "middle") return { ...obj, y: (design.height - h) / 2 };
          return { ...obj, y: design.height - h };
        }),
      }));
    },

    lockSelected: () => {
      const { selectedIds } = get();
      if (selectedIds.length === 0) return;
      pushHistory();
      withPage((page) => ({
        ...page,
        objects: page.objects.map((obj) => (selectedIds.includes(obj.id) ? { ...obj, locked: true } : obj)),
      }));
    },

    unlockSelected: () => {
      const { selectedIds } = get();
      if (selectedIds.length === 0) return;
      pushHistory();
      withPage((page) => ({
        ...page,
        objects: page.objects.map((obj) => (selectedIds.includes(obj.id) ? { ...obj, locked: false } : obj)),
      }));
    },

    groupSelected: () => {
      const { selectedIds } = get();
      if (selectedIds.length < 2) return;
      const groupId = uuid();
      pushHistory();
      withPage((page) => ({
        ...page,
        objects: page.objects.map((obj) => (selectedIds.includes(obj.id) ? { ...obj, groupId } : obj)),
      }));
    },

    ungroupSelected: () => {
      const { selectedIds } = get();
      if (selectedIds.length === 0) return;
      pushHistory();
      withPage((page) => ({
        ...page,
        objects: page.objects.map((obj) => {
          if (!selectedIds.includes(obj.id) || !obj.groupId) return obj;
          const next = { ...obj };
          delete next.groupId;
          return next;
        }),
      }));
    },

    setObjectVisible: (id, visible) => {
      pushHistory();
      withPage((page) => ({
        ...page,
        objects: page.objects.map((obj) => (obj.id === id ? { ...obj, visible } : obj)),
      }));
    },

    addPage: () => {
      const design = currentDesign();
      if (!design) return;
      pushHistory();
      const page: Page = { id: uuid(), background: "#ffffff", objects: [] };
      commit({ ...design, pages: [...design.pages, page] }, {
        currentPageIndex: design.pages.length,
        selectedIds: [],
      });
    },

    duplicatePage: () => {
      const { design, currentPageIndex } = get();
      if (!design) return;
      pushHistory();
      const copy = clonePage(design.pages[currentPageIndex]);
      delete copy.role;
      const pages = [...design.pages];
      pages.splice(currentPageIndex + 1, 0, copy);
      commit({ ...design, pages }, { currentPageIndex: currentPageIndex + 1, selectedIds: [] });
    },

    deletePage: () => {
      const { design, currentPageIndex } = get();
      if (!design || !canDeleteShirtPage(design, currentPageIndex)) return;
      pushHistory();
      const pages = design.pages.filter((_, i) => i !== currentPageIndex);
      commit({ ...design, pages }, {
        currentPageIndex: Math.min(currentPageIndex, pages.length - 1),
        selectedIds: [],
      });
    },

    setPageIndex: (index) => {
      const { design } = get();
      if (!design) return;
      const i = clamp(index, 0, design.pages.length - 1);
      set({ currentPageIndex: i, selectedIds: [], editingTextId: null });
    },

    reorderPages: (from, to) => {
      const design = currentDesign();
      if (!design || from === to) return;
      pushHistory();
      const pages = [...design.pages];
      const [moved] = pages.splice(from, 1);
      pages.splice(to, 0, moved);
      commit({ ...design, pages }, { currentPageIndex: to, selectedIds: [] });
    },

    applyTemplateToPage: (templateId) => {
      const { design, currentPageIndex } = get();
      const tpl = templateById(templateId);
      if (!design || !tpl) return;
      const built = tpl.build();
      const first = built[0];
      if (!first) return;
      const scaled = scalePage(first, tpl.width, tpl.height, design.width, design.height);
      pushHistory();
      withPage((page) => ({
        ...page,
        background: scaled.background,
        objects: scaled.objects,
      }));
      if (built.length > 1) {
        const extra = built.slice(1).map((p) => scalePage(p, tpl.width, tpl.height, design.width, design.height));
        const pages = [...get().design!.pages];
        pages.splice(currentPageIndex + 1, 0, ...extra);
        commit({ ...get().design!, pages });
      }
    },
  };
});

export function currentPage(state: DocumentState): Page | null {
  if (!state.design) return null;
  return state.design.pages[state.currentPageIndex] ?? null;
}

export function selectedObjects(state: DocumentState): CanvasObject[] {
  const page = currentPage(state);
  if (!page) return [];
  return page.objects.filter((o) => state.selectedIds.includes(o.id));
}

export function isText(obj: CanvasObject): obj is TextObject {
  return obj.type === "text";
}

export { fontOf };
