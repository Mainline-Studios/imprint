import { Image as KonvaImage } from "react-konva";
import { useAssetImage } from "../../assets/cache";
import type { ImageObject } from "../../types";
import { ObjectGroup } from "../ObjectGroup";
import type { Guides } from "../snap";

export function ImageNode({ obj, onGuides }: { obj: ImageObject; onGuides: (g: Guides) => void }) {
  const image = useAssetImage(obj.assetId);
  return (
    <ObjectGroup obj={obj} onGuides={onGuides}>
      <KonvaImage image={image} width={obj.width} height={obj.height} listening perfectDrawEnabled={false} />
    </ObjectGroup>
  );
}
