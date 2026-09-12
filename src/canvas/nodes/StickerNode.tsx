import { Path } from "react-konva";
import { stickerById } from "../../library/stickers";
import type { StickerObject } from "../../types";
import { ObjectGroup } from "../ObjectGroup";
import type { Guides } from "../snap";

export function StickerNode({ obj, onGuides }: { obj: StickerObject; onGuides: (g: Guides) => void }) {
  const def = stickerById(obj.sticker);
  if (!def) return null;
  const scaleX = obj.width / def.view;
  const scaleY = obj.height / def.view;
  return (
    <ObjectGroup obj={obj} onGuides={onGuides}>
      <Path
        data={def.path}
        fill={obj.fill}
        stroke={obj.fill}
        strokeWidth={0.6}
        lineJoin="round"
        lineCap="round"
        scaleX={scaleX}
        scaleY={scaleY}
        listening
        perfectDrawEnabled={false}
      />
    </ObjectGroup>
  );
}
