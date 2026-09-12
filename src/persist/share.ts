import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase/app";
import { uuid } from "../lib/ids";
import type { Design, ShareSnapshot } from "../types";
import { currentUid, ensureLocalAsset } from "./assets";
import { getAsset } from "./db";

export const SHARE_PUBLIC_BASE = "https://mainline-studios.github.io/imprint/#/s/";

function shareDoc(token: string) {
  return doc(db, "shares", token);
}

function collectAssetIds(design: Design): string[] {
  const ids = new Set<string>();
  for (const page of design.pages) {
    for (const obj of page.objects) {
      if (obj.type === "image") ids.add(obj.assetId);
    }
  }
  return [...ids];
}

export async function createShare(design: Design): Promise<string> {
  const uid = currentUid();
  if (!uid) throw new Error("Sign in to copy a share link.");
  const token = uuid();
  const assetUrls: Record<string, string> = {};
  for (const id of collectAssetIds(design)) {
    const rec = (await getAsset(id)) ?? (await ensureLocalAsset(id));
    if (!rec) continue;
    const sref = ref(storage, `shares/${token}/assets/${id}`);
    await uploadBytes(sref, rec.blob, { contentType: rec.mime || "image/jpeg" });
    assetUrls[id] = await getDownloadURL(sref);
  }
  const payload: ShareSnapshot = {
    ownerUid: uid,
    name: design.name.slice(0, 200) || "Untitled",
    width: design.width,
    height: design.height,
    pages: JSON.parse(JSON.stringify(design.pages)) as ShareSnapshot["pages"],
    assetUrls,
    createdAt: Date.now(),
  };
  await setDoc(shareDoc(token), payload);
  return token;
}

export async function loadShare(token: string): Promise<ShareSnapshot | null> {
  const snap = await getDoc(shareDoc(token));
  if (!snap.exists()) return null;
  return snap.data() as ShareSnapshot;
}

export async function deleteShare(token: string): Promise<void> {
  await deleteDoc(shareDoc(token));
}

export function shareUrl(token: string): string {
  return `${SHARE_PUBLIC_BASE}${token}`;
}
