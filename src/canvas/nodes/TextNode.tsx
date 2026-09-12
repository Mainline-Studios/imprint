import { Image, Rect, Text } from "react-konva";
import { textDrawNodes } from "../textEffects";
import type { TextObject } from "../../types";
import { ObjectGroup } from "../ObjectGroup";
import type { Guides } from "../snap";

export function TextNode({
  obj,
  onGuides,
  onEdit,
}: {
  obj: TextObject;
  onGuides: (g: Guides) => void;
  onEdit: () => void;
}) {
  const nodes = textDrawNodes(obj);
  return (
    <ObjectGroup obj={obj} onGuides={onGuides} onDblClick={onEdit}>
      {nodes.map((node, i) => {
        if (node.type === "text") {
          return <Text key={i} {...node.props} listening={node.listening} />;
        }
        if (node.type === "rect") {
          return <Rect key={i} {...node.props} />;
        }
        return <Image key={i} {...node.props} />;
      })}
    </ObjectGroup>
  );
}
