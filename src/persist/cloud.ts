import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/app";
import type { Design, Page, ShirtMeta } from "../types";

const MAX_JSON_CHARS = 900_000;

function designsCol(uid: string) {
  return collection(db, "users", uid, "designs");
}

function designDoc(uid: string, id: string) {
  return doc(db, "users", uid, "designs", id);
}

function toCloud(design: Design, uid: string): Record<string, unknown> {
  const payload = {
    id: design.id,
    ownerUid: uid,
    name: design.name.slice(0, 200) || "Untitled",
    width: design.width,
    height: design.height,
    pages: design.pages,
    updatedAt: design.updatedAt,
    ...(design.shirt ? { shirt: design.shirt } : {}),
    ...(design.brandColors ? { brandColors: design.brandColors } : {}),
    ...(design.folder ? { folder: design.folder } : {}),
  };
  return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
}

function fromCloud(data: Record<string, unknown>): Design {
  const pages = (Array.isArray(data.pages) ? data.pages : []) as Page[];
  const next: Design = {
    id: String(data.id ?? ""),
    name: String(data.name ?? "Untitled"),
    width: Number(data.width) || 1080,
    height: Number(data.height) || 1080,
    pages,
    updatedAt: Number(data.updatedAt) || Date.now(),
  };
  if (typeof data.ownerUid === "string") next.ownerUid = data.ownerUid;
  if (data.shirt && typeof data.shirt === "object") next.shirt = data.shirt as ShirtMeta;
  if (Array.isArray(data.brandColors)) {
    next.brandColors = data.brandColors.filter((c): c is string => typeof c === "string");
  }
  if (typeof data.folder === "string" && data.folder) next.folder = data.folder;
  return next;
}

export async function listCloudDesigns(uid: string): Promise<Design[]> {
  const snap = await getDocs(designsCol(uid));
  return snap.docs.map((d) => fromCloud(d.data()));
}

export async function saveCloudDesign(uid: string, design: Design): Promise<void> {
  const payload = toCloud(design, uid);
  if (JSON.stringify(payload).length > MAX_JSON_CHARS) {
    console.warn("Imprint: design is too large to save to your account.");
    return;
  }
  await setDoc(designDoc(uid, design.id), payload);
}

export async function deleteCloudDesign(uid: string, id: string): Promise<void> {
  await deleteDoc(designDoc(uid, id));
}

export function currentUid(): string | undefined {
  return auth.currentUser?.uid;
}
