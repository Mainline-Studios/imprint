import { useEffect, useMemo, useRef } from "react";
import type Konva from "konva";
import KonvaLib from "konva";
import { Image as KonvaImage } from "react-konva";
import { useAssetImage } from "../../assets/cache";
import { imageHasFilters, normalizedCrop } from "../../lib/fill";
import type { ImageObject } from "../../types";
import { ObjectGroup } from "../ObjectGroup";
import type { Guides } from "../snap";

export function ImageNode({ obj, onGuides }: { obj: ImageObject; onGuides: (g: Guides) => void }) {
  const image = useAssetImage(obj.assetId);
  const nodeRef = useRef<Konva.Image>(null);
  const filter = obj.filter;
  const hasFilters = imageHasFilters(filter);
  const filters = useMemo(() => {
    if (!hasFilters || !filter) return undefined;
    const list: Array<typeof KonvaLib.Filters.Brighten> = [];
    if (filter.brighten) list.push(KonvaLib.Filters.Brighten);
    if (filter.contrast) list.push(KonvaLib.Filters.Contrast);
    if (filter.grayscale) list.push(KonvaLib.Filters.Grayscale);
    if (filter.blur) list.push(KonvaLib.Filters.Blur);
    return list;
  }, [hasFilters, filter]);

  const crop = useMemo(() => {
    if (!image) return undefined;
    const c = normalizedCrop(obj.crop);
    if (c.x === 0 && c.y === 0 && c.w === 1 && c.h === 1) return undefined;
    return {
      x: c.x * image.naturalWidth,
      y: c.y * image.naturalHeight,
      width: Math.max(1, c.w * image.naturalWidth),
      height: Math.max(1, c.h * image.naturalHeight),
    };
  }, [image, obj.crop]);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || !image) return;
    if (hasFilters) node.cache();
    else node.clearCache();
    node.getLayer()?.batchDraw();
  }, [image, obj.width, obj.height, hasFilters, filters, crop, filter?.brighten, filter?.contrast, filter?.blur, filter?.grayscale]);

  return (
    <ObjectGroup obj={obj} onGuides={onGuides}>
      <KonvaImage
        ref={nodeRef}
        image={image}
        width={obj.width}
        height={obj.height}
        crop={crop}
        filters={filters}
        brightness={filter?.brighten ?? 0}
        contrast={filter?.contrast ?? 0}
        blurRadius={filter?.blur ?? 0}
        listening
        perfectDrawEnabled={false}
      />
    </ObjectGroup>
  );
}
