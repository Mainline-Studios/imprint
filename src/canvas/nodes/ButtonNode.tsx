import { Rect, Text } from "react-konva";
import { fontOf } from "../../fonts/catalog";
import { useDocumentStore } from "../../store/document";
import type { ButtonObject } from "../../types";
import { ObjectGroup } from "../ObjectGroup";
import type { Guides } from "../snap";

export function ButtonNode({
  obj,
  onGuides,
  onEdit,
}: {
  obj: ButtonObject;
  onGuides: (g: Guides) => void;
  onEdit: () => void;
}) {
  const editing = useDocumentStore((s) => s.editingTextId === obj.id);
  return (
    <ObjectGroup obj={obj} onGuides={onGuides} onDblClick={onEdit}>
      <Rect
        width={obj.width}
        height={obj.height}
        fill={obj.fill}
        cornerRadius={obj.cornerRadius}
        listening
        perfectDrawEnabled={false}
      />
      <Text
        width={obj.width}
        height={obj.height}
        text={obj.text}
        fontFamily={fontOf(obj.fontFamily)}
        fontSize={obj.fontSize}
        fontStyle={obj.fontWeight >= 600 ? "bold" : "normal"}
        fill={obj.textFill}
        align="center"
        verticalAlign="middle"
        listening={false}
        wrap="none"
        ellipsis
        opacity={editing ? 0 : 1}
      />
    </ObjectGroup>
  );
}
