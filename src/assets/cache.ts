import { useEffect, useState } from "react";
import { getAsset } from "../persist/db";

const objectUrls = new Map<string, string>();
const images = new Map<string, HTMLImageElement>();
const inflight = new Map<string, Promise<HTMLImageElement>>();

export async function loadAssetImage(assetId: string): Promise<HTMLImageElement> {
  const cached = images.get(assetId);
  if (cached?.complete) return cached;

  const pending = inflight.get(assetId);
  if (pending) return pending;

  const task = (async () => {
    const rec = await getAsset(assetId);
    if (!rec) throw new Error(`Missing asset ${assetId}`);
    let url = objectUrls.get(assetId);
    if (!url) {
      url = URL.createObjectURL(rec.blob);
      objectUrls.set(assetId, url);
    }
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Failed to load asset ${assetId}`));
      el.src = url;
    });
    images.set(assetId, img);
    return img;
  })();

  inflight.set(assetId, task);
  try {
    return await task;
  } finally {
    inflight.delete(assetId);
  }
}

export function useAssetImage(assetId: string | undefined): HTMLImageElement | undefined {
  const [image, setImage] = useState<HTMLImageElement | undefined>(() =>
    assetId ? images.get(assetId) : undefined,
  );

  useEffect(() => {
    if (!assetId) {
      setImage(undefined);
      return;
    }
    const existing = images.get(assetId);
    if (existing?.complete) {
      setImage(existing);
      return;
    }
    let cancelled = false;
    void loadAssetImage(assetId)
      .then((img) => {
        if (!cancelled) setImage(img);
      })
      .catch(() => {
        if (!cancelled) setImage(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  return image;
}

export async function blobFromFile(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const max = 4096;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 6_000_000) {
    const width = bitmap.width;
    const height = bitmap.height;
    bitmap.close();
    return { blob: file, width, height };
  }
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return { blob: file, width: bitmap.width, height: bitmap.height };
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode image"))),
      "image/jpeg",
      0.9,
    );
  });
  return { blob, width, height };
}
