import type { Design } from "../types";
import { deleteCloudDesign, listCloudDesigns, saveCloudDesign, currentUid } from "./cloud";
import { deleteDesignRecord, listDesigns, putDesign } from "./db";

function stamp(design: Design): Design {
  const uid = currentUid();
  return uid ? { ...design, ownerUid: uid } : design;
}

export async function saveDesign(design: Design): Promise<void> {
  const next = stamp(design);
  await putDesign(next);
  const uid = currentUid();
  if (!uid) return;
  try {
    await saveCloudDesign(uid, next);
  } catch (err) {
    console.warn("Imprint: account save failed; kept on this device.", err);
  }
}

export async function removeDesign(id: string): Promise<void> {
  await deleteDesignRecord(id);
  const uid = currentUid();
  if (!uid) return;
  try {
    await deleteCloudDesign(uid, id);
  } catch (err) {
    console.warn("Imprint: account delete failed.", err);
  }
}

/** Merge IndexedDB and Firestore. Local always works; cloud follows the Google account. */
export async function hydrateDesigns(): Promise<Design[]> {
  const local = await listDesigns();
  const uid = currentUid();
  if (!uid) return local.sort((a, b) => b.updatedAt - a.updatedAt);

  let cloud: Design[] = [];
  try {
    cloud = await listCloudDesigns(uid);
  } catch (err) {
    console.warn("Imprint: could not load account designs.", err);
    return local.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  const cloudById = new Map(cloud.map((d) => [d.id, d]));
  const merged = new Map<string, Design>();

  for (const d of local) merged.set(d.id, d);

  for (const remote of cloud) {
    const existing = merged.get(remote.id);
    if (!existing || remote.updatedAt > existing.updatedAt) {
      merged.set(remote.id, remote);
      await putDesign(remote);
    }
  }

  for (const localDesign of local) {
    const remote = cloudById.get(localDesign.id);
    if (!remote || localDesign.updatedAt > remote.updatedAt) {
      try {
        await saveCloudDesign(uid, stamp(localDesign));
      } catch (err) {
        console.warn("Imprint: could not upload a local design.", err);
      }
    }
  }

  return [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}
