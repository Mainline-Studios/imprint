import { auth } from "../firebase/app";
import type { AssetRecord, Design } from "../types";

/** Each browser origin starts with this much local room. Verified email lifts it. */
export const GB = 1024 ** 3;
export const DEVICE_QUOTA_BYTES = 50 * GB;

export class QuotaError extends Error {
  used: number;
  cap: number;
  verified: boolean;

  constructor(used: number, cap: number, verified: boolean) {
    super(
      verified
        ? `This device is out of room (${formatBytes(used)} used).`
        : `Every device holds ${formatBytes(cap)} until you verify an email. Open Profile to expand storage.`,
    );
    this.name = "QuotaError";
    this.used = used;
    this.cap = cap;
    this.verified = verified;
  }
}

export function emailIsVerified(): boolean {
  return Boolean(auth.currentUser?.emailVerified);
}

export function quotaBytes(verified = emailIsVerified()): number | null {
  return verified ? null : DEVICE_QUOTA_BYTES;
}

export function usageBytes(designs: Design[], assets: AssetRecord[]): number {
  let n = 0;
  for (const asset of assets) n += asset.blob.size;
  try {
    n += new Blob([JSON.stringify(designs)]).size;
  } catch {
    n += designs.length * 2048;
  }
  return n;
}

export function assertRoom(used: number, extra: number, verified = emailIsVerified()): void {
  const cap = quotaBytes(verified);
  if (cap == null) return;
  if (used + extra > cap) throw new QuotaError(used, cap, verified);
}

export async function requestDeviceStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${Math.max(0, Math.round(n))} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / GB).toFixed(1)} GB`;
}

export function formatGb(n: number): string {
  const gb = n / GB;
  if (gb >= 10) return `${Math.round(gb)} GB`;
  return `${gb.toFixed(1)} GB`;
}
