import type { FontFamily } from "./fonts/catalog";

export type { FontFamily };
export type TextAlign = "left" | "center" | "right";
export type ShapeKind = "rect" | "ellipse" | "triangle" | "line";
export type FontWeight = 400 | 500 | 600 | 700;
export type TextTransform = "none" | "uppercase" | "small-caps";
export type TextEffectId =
  | "none"
  | "drop"
  | "glow"
  | "echo"
  | "outline"
  | "background"
  | "splice"
  | "hollow"
  | "neon"
  | "glitch"
  | "neonLights"
  | "tvStatic"
  | "seventies"
  | "scifi"
  | "screenprint"
  | "western"
  | "graffiti"
  | "bubble"
  | "aerobics"
  | "arcade"
  | "cosmic"
  | "pixel";
export type SidebarTab = "templates" | "elements" | "text" | "stickers" | "uploads" | "layers";
export type View = "home" | "editor";

export type ColorStop = {
  offset: number;
  color: string;
};

export type LinearFill = {
  kind: "linear";
  angle: number;
  stops: ColorStop[];
};

export type Fill = string | LinearFill;

export type ImageCrop = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ImageFilter = {
  brighten?: number;
  contrast?: number;
  grayscale?: boolean;
  blur?: number;
};

export type ObjectFlags = {
  locked?: boolean;
  groupId?: string;
  visible?: boolean;
};

export type TextObject = {
  id: string;
  type: "text";
  x: number;
  y: number;
  width: number;
  rotation: number;
  text: string;
  fontFamily: FontFamily;
  fontSize: number;
  fontWeight: FontWeight;
  align: TextAlign;
  fill: string;
  opacity: number;
  effect?: TextEffectId;
  curve?: number;
  stroke?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: TextTransform;
} & ObjectFlags;

export type ShapeObject = {
  id: string;
  type: "shape";
  shape: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: Fill;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  opacity: number;
} & ObjectFlags;

export type ImageObject = {
  id: string;
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  assetId: string;
  opacity: number;
  crop?: ImageCrop;
  filter?: ImageFilter;
} & ObjectFlags;

export type ButtonObject = {
  id: string;
  type: "button";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  text: string;
  href: string;
  fill: string;
  textFill: string;
  fontFamily: FontFamily;
  fontSize: number;
  fontWeight: FontWeight;
  cornerRadius: number;
  opacity: number;
} & ObjectFlags;

export type StickerObject = {
  id: string;
  type: "sticker";
  sticker: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  opacity: number;
} & ObjectFlags;

export type CanvasObject = TextObject | ShapeObject | ImageObject | ButtonObject | StickerObject;

export type ShirtView = "front" | "back" | "left-shoulder" | "right-shoulder";

export type ShirtMeta = {
  color: string;
  neck: "crew" | "v";
};

export type Page = {
  id: string;
  background: Fill;
  objects: CanvasObject[];
  role?: ShirtView;
};

export type Design = {
  id: string;
  name: string;
  width: number;
  height: number;
  pages: Page[];
  updatedAt: number;
  shirt?: ShirtMeta;
  ownerUid?: string;
  brandColors?: string[];
  folder?: string;
};

export type Snapshot = {
  name: string;
  width: number;
  height: number;
  pages: Page[];
  currentPageIndex: number;
  selectedIds: string[];
  shirt?: ShirtMeta;
  brandColors?: string[];
  folder?: string;
};

export type ShareSnapshot = {
  ownerUid: string;
  name: string;
  width: number;
  height: number;
  pages: Page[];
  assetUrls: Record<string, string>;
  createdAt: number;
};

export type AssetRecord = {
  id: string;
  blob: Blob;
  mime: string;
  name: string;
  createdAt: number;
};

export type SizePreset = {
  id: string;
  name: string;
  width: number;
  height: number;
  group: "social" | "presentation" | "print" | "site" | "email" | "custom";
};

export type TemplateDef = {
  id: string;
  name: string;
  category: "social" | "presentation" | "print" | "site" | "email";
  width: number;
  height: number;
  build: () => Page[];
};
