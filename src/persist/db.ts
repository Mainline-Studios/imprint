import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { AssetRecord, Design } from "../types";

interface ImprintDB extends DBSchema {
  designs: {
    key: string;
    value: Design;
    indexes: { "by-updated": number };
  };
  assets: {
    key: string;
    value: AssetRecord;
  };
}

const DB_NAME = "imprint";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ImprintDB>> | null = null;

function getDb(): Promise<IDBPDatabase<ImprintDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ImprintDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("designs")) {
          const designs = db.createObjectStore("designs", { keyPath: "id" });
          designs.createIndex("by-updated", "updatedAt");
        }
        if (!db.objectStoreNames.contains("assets")) {
          db.createObjectStore("assets", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function listDesigns(): Promise<Design[]> {
  const db = await getDb();
  const all = await db.getAll("designs");
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDesign(id: string): Promise<Design | undefined> {
  const db = await getDb();
  return db.get("designs", id);
}

export async function putDesign(design: Design): Promise<void> {
  const db = await getDb();
  await db.put("designs", design);
}

export async function deleteDesignRecord(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("designs", id);
}

export async function putAsset(asset: AssetRecord): Promise<void> {
  const db = await getDb();
  await db.put("assets", asset);
}

export async function getAsset(id: string): Promise<AssetRecord | undefined> {
  const db = await getDb();
  return db.get("assets", id);
}

export async function listAssets(): Promise<AssetRecord[]> {
  const db = await getDb();
  const all = await db.getAll("assets");
  return all.sort((a, b) => b.createdAt - a.createdAt);
}
