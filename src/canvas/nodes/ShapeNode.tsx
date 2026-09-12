import { Ellipse, Line, Rect } from "react-konva";
import type { ShapeObject } from "../../types";
import { ObjectGroup } from "../ObjectGroup";
import type { Guides } from "../snap";

export function ShapeNode({ obj, onGuides }: { obj: ShapeObject; onGuides: (g: Guides) => void }) {
  const common = {
    fill: obj.fill,
    stroke: obj.strokeWidth ? obj.stroke : undefined,
    strokeWidth: obj.strokeWidth,
    listening: true,
    perfectDrawEnabled: false,
  };

  return (
    <ObjectGroup obj={obj} onGuides={onGuides}>
      {obj.shape === "rect" || obj.shape === "line" ? (
        <Rect
          width={obj.width}
          height={obj.height}
          cornerRadius={obj.shape === "line" ? 99 : obj.cornerRadius}
          {...common}
          fill={obj.shape === "line" ? obj.fill : obj.fill}
        />
      ) : obj.shape === "ellipse" ? (
        <Ellipse x={obj.width / 2} y={obj.height / 2} radiusX={obj.width / 2} radiusY={obj.height / 2} {...common} />
      ) : (
        <Line
          points={[obj.width / 2, 0, obj.width, obj.height, 0, obj.height]}
          closed
          {...common}
        />
      )}
    </ObjectGroup>
  );
}
