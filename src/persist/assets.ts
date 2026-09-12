import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, storage } from "../firebase/app";
import type { AssetRecord } from "../types";
import { getAsset, putAsset } from "./db";

export function currentUid(): string | undefined {
  return auth.currentUser?.uid;
}

export async function uploadUserAsset(uid: string, asset: AssetRecord): Promise<void> {
  const path = `users/${uid}/assets/${asset.id}`;
  await uploadBytes(ref(storage, path), asset.blob, { contentType: asset.mime || "image/jpeg" });
}

export async function fetchUserAsset(uid: string, assetId: string): Promise<AssetRecord | undefined> {
  try {
    const url = await getDownloadURL(ref(storage, `users/${uid}/assets/${assetId}`));
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    const rec: AssetRecord = {
      id: assetId,
      blob,
      mime: blob.type || "image/jpeg",
      name: assetId,
      createdAt: Date.now(),
    };
    await putAsset(rec);
    return rec;
  } catch {
    return undefined;
  }
}

export async function ensureLocalAsset(assetId: string): Promise<AssetRecord | undefined> {
  const local = await getAsset(assetId);
  if (local) return local;
  const uid = currentUid();
  if (!uid) return undefined;
  return fetchUserAsset(uid, assetId);
}

export async function persistAsset(asset: AssetRecord): Promise<void> {
  await putAsset(asset);
  const uid = currentUid();
  if (!uid) return;
  try {
    await uploadUserAsset(uid, asset);
  } catch (err) {
    console.warn("Imprint: account image upload failed; kept on this device.", err);
  }
}
