import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/app";
import { DEFAULT_BRAND } from "../lib/fill";

export { DEFAULT_BRAND };

const LS_KEY = "imprint-brand-colors";

function readLocal(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c): c is string => typeof c === "string" && c.length > 0).slice(0, 24);
  } catch {
    return [];
  }
}

function writeLocal(colors: string[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(colors.slice(0, 24)));
  } catch {
    /* quota */
  }
}

function brandDoc(uid: string) {
  return doc(db, "users", uid, "brand", "palette");
}

export async function loadBrandColors(): Promise<string[]> {
  const uid = auth.currentUser?.uid;
  if (uid) {
    try {
      const snap = await getDoc(brandDoc(uid));
      if (snap.exists()) {
        const colors = snap.data().colors;
        if (Array.isArray(colors)) {
          const next = colors.filter((c: unknown): c is string => typeof c === "string" && c.length > 0).slice(0, 24);
          writeLocal(next);
          return next;
        }
      }
    } catch (err) {
      console.warn("Imprint: could not load account colors.", err);
    }
  }
  return readLocal();
}

export async function saveBrandColors(colors: string[]): Promise<void> {
  const next = colors.filter((c) => c.trim().length > 0).slice(0, 24);
  writeLocal(next);
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    await setDoc(brandDoc(uid), { colors: next });
  } catch (err) {
    console.warn("Imprint: could not save account colors.", err);
  }
}
