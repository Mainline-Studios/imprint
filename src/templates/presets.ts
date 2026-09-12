import type { SizePreset } from "../types";

export const SIZE_PRESETS: SizePreset[] = [
  { id: "ig-post", name: "Instagram post", width: 1080, height: 1080, group: "social" },
  { id: "ig-story", name: "Instagram story", width: 1080, height: 1920, group: "social" },
  { id: "yt-thumb", name: "YouTube thumbnail", width: 1280, height: 720, group: "social" },
  { id: "fb-post", name: "Facebook post", width: 1200, height: 630, group: "social" },
  { id: "x-post", name: "X post", width: 1600, height: 900, group: "social" },
  { id: "presentation", name: "Presentation 16:9", width: 1920, height: 1080, group: "presentation" },
  { id: "a4", name: "A4 poster", width: 794, height: 1123, group: "print" },
  { id: "letter", name: "Letter", width: 816, height: 1056, group: "print" },
  { id: "letter-landscape", name: "Letter landscape", width: 1056, height: 816, group: "print" },
  { id: "tshirt", name: "T-shirt", width: 1200, height: 1600, group: "print" },
  { id: "tshirt-wide", name: "T-shirt wide", width: 1600, height: 1200, group: "print" },
  { id: "website", name: "Website", width: 1440, height: 900, group: "site" },
  { id: "website-wide", name: "Website wide", width: 1920, height: 1200, group: "site" },
  { id: "email", name: "Email", width: 600, height: 800, group: "email" },
  { id: "email-long", name: "Email long", width: 600, height: 1200, group: "email" },
];

export function presetGroup(width: number, height: number): SizePreset["group"] | "custom" {
  return SIZE_PRESETS.find((p) => p.width === width && p.height === height)?.group ?? "custom";
}

export function presetLabel(width: number, height: number, group?: SizePreset["group"]): string {
  const match = SIZE_PRESETS.find(
    (p) => p.width === width && p.height === height && (group == null || p.group === group),
  );
  return match ? match.name : `${Math.round(width)} × ${Math.round(height)}`;
}

export function isSiteSize(width: number, height: number): boolean {
  return SIZE_PRESETS.some((p) => p.group === "site" && p.width === width && p.height === height);
}

export function isEmailSize(width: number, height: number): boolean {
  return SIZE_PRESETS.some((p) => p.group === "email" && p.width === width && p.height === height);
}

export function isHtmlCanvas(width: number, height: number): boolean {
  return isSiteSize(width, height) || isEmailSize(width, height);
}

export function isTshirtSize(width: number, height: number): boolean {
  return SIZE_PRESETS.some(
    (p) => (p.id === "tshirt" || p.id === "tshirt-wide") && p.width === width && p.height === height,
  );
}
