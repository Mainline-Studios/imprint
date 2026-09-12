export type FontCategory = "sans" | "serif" | "display" | "script" | "mono";

export type FontDef = {
  family: string;
  category: FontCategory;
  fallback: string;
};

export const FONT_CATALOG: readonly FontDef[] = [
  { family: "Inter", category: "sans", fallback: "system-ui, sans-serif" },
  { family: "DM Sans", category: "sans", fallback: "system-ui, sans-serif" },
  { family: "IBM Plex Sans", category: "sans", fallback: "system-ui, sans-serif" },
  { family: "Source Sans 3", category: "sans", fallback: "system-ui, sans-serif" },
  { family: "Nunito", category: "sans", fallback: "system-ui, sans-serif" },
  { family: "Outfit", category: "sans", fallback: "system-ui, sans-serif" },
  { family: "Manrope", category: "sans", fallback: "system-ui, sans-serif" },
  { family: "Karla", category: "sans", fallback: "system-ui, sans-serif" },
  { family: "Figtree", category: "sans", fallback: "system-ui, sans-serif" },
  { family: "Work Sans", category: "sans", fallback: "system-ui, sans-serif" },
  { family: "Plus Jakarta Sans", category: "sans", fallback: "system-ui, sans-serif" },
  { family: "Space Grotesk", category: "sans", fallback: "system-ui, sans-serif" },
  { family: "Playfair Display", category: "serif", fallback: "Georgia, serif" },
  { family: "Fraunces", category: "serif", fallback: "Georgia, serif" },
  { family: "Libre Baskerville", category: "serif", fallback: "Georgia, serif" },
  { family: "Lora", category: "serif", fallback: "Georgia, serif" },
  { family: "Cormorant Garamond", category: "serif", fallback: "Georgia, serif" },
  { family: "EB Garamond", category: "serif", fallback: "Georgia, serif" },
  { family: "Instrument Serif", category: "serif", fallback: "Georgia, serif" },
  { family: "Source Serif 4", category: "serif", fallback: "Georgia, serif" },
  { family: "Newsreader", category: "serif", fallback: "Georgia, serif" },
  { family: "Oswald", category: "display", fallback: "Impact, sans-serif" },
  { family: "Bebas Neue", category: "display", fallback: "Impact, sans-serif" },
  { family: "Anton", category: "display", fallback: "Impact, sans-serif" },
  { family: "Archivo Black", category: "display", fallback: "Impact, sans-serif" },
  { family: "Abril Fatface", category: "display", fallback: "Georgia, serif" },
  { family: "Unbounded", category: "display", fallback: "system-ui, sans-serif" },
  { family: "Syne", category: "display", fallback: "system-ui, sans-serif" },
  { family: "Great Vibes", category: "script", fallback: "cursive" },
  { family: "Pacifico", category: "script", fallback: "cursive" },
  { family: "Dancing Script", category: "script", fallback: "cursive" },
  { family: "Caveat", category: "script", fallback: "cursive" },
  { family: "Pinyon Script", category: "script", fallback: "cursive" },
  { family: "IBM Plex Mono", category: "mono", fallback: "ui-monospace, monospace" },
  { family: "JetBrains Mono", category: "mono", fallback: "ui-monospace, monospace" },
] as const;

export type FontFamily = (typeof FONT_CATALOG)[number]["family"];

export const FONT_GROUPS: { category: FontCategory; label: string }[] = [
  { category: "sans", label: "Sans" },
  { category: "serif", label: "Serif" },
  { category: "display", label: "Display" },
  { category: "script", label: "Script" },
  { category: "mono", label: "Mono" },
];

const FONT_MAP = new Map(FONT_CATALOG.map((font) => [font.family, font]));

export function isFontFamily(value: string): value is FontFamily {
  return FONT_MAP.has(value as FontFamily);
}

export function fontOf(family: string): string {
  const font = FONT_MAP.get(family as FontFamily);
  if (!font) return `"${family}", Inter, system-ui, sans-serif`;
  return `"${font.family}", ${font.fallback}`;
}

export function fontsIn(category: FontCategory): readonly FontDef[] {
  return FONT_CATALOG.filter((font) => font.category === category);
}
