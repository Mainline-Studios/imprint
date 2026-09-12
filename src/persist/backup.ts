import type { AssetRecord, Design } from "../types";
import { persistAsset } from "./assets";
import { saveBrandColors } from "./brand";
import { saveDesign } from "./save";

export const BACKUP_VERSION = 1;

export type BackupFile = {
  v: number;
  exportedAt: number;
  brandColors: string[];
  designs: Design[];
  assets: { id: string; name: string; mime: string; createdAt: number; data: string }[];
};

function isDesign(value: unknown): value is Design {
  if (!value || typeof value !== "object") return false;
  const d = value as Design;
  return typeof d.id === "string" && typeof d.name === "string" && Array.isArray(d.pages);
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function buildBackup(
  designs: Design[],
  assets: AssetRecord[],
  brandColors: string[],
): Promise<Blob> {
  const packed: BackupFile = {
    v: BACKUP_VERSION,
    exportedAt: Date.now(),
    brandColors: brandColors.slice(0, 24),
    designs,
    assets: await Promise.all(
      assets.map(async (a) => ({
        id: a.id,
        name: a.name,
        mime: a.mime,
        createdAt: a.createdAt,
        data: await blobToDataUrl(a.blob),
      })),
    ),
  };
  return new Blob([JSON.stringify(packed)], { type: "application/json" });
}

export async function applyBackup(file: File): Promise<{ designs: number; assets: number }> {
  const parsed = JSON.parse(await file.text()) as unknown;
  if (!parsed || typeof parsed !== "object") throw new Error("That file is not an Imprint backup.");
  const data = parsed as Partial<BackupFile>;
  const designs = Array.isArray(data.designs) ? data.designs.filter(isDesign) : [];
  const assets = Array.isArray(data.assets) ? data.assets : [];
  if (designs.length === 0 && assets.length === 0) throw new Error("No designs or photos in that backup.");

  for (const item of assets) {
    if (!item || typeof item.id !== "string" || typeof item.data !== "string") continue;
    const res = await fetch(item.data);
    const blob = await res.blob();
    await persistAsset({
      id: item.id,
      blob,
      mime: item.mime || blob.type || "image/jpeg",
      name: item.name || item.id,
      createdAt: Number(item.createdAt) || Date.now(),
    });
  }

  for (const design of designs) {
    await saveDesign({ ...design, updatedAt: Number(design.updatedAt) || Date.now() });
  }

  if (Array.isArray(data.brandColors)) {
    const colors = data.brandColors.filter((c): c is string => typeof c === "string" && c.length > 0).slice(0, 24);
    await saveBrandColors(colors);
  }

  return { designs: designs.length, assets: assets.length };
}
