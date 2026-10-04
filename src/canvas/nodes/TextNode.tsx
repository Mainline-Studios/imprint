import { Group, Image, Rect, Text } from "react-konva";
import { fontOf } from "../../fonts/catalog";
import { hasPointsToken, layoutVariableText, measureTextWidth, POINTS_LABEL, POINTS_TOKEN, splitVariables } from "../../lib/variables";
import { isCurved, letterSpacingOf, lineHeightOf, textTransformOf } from "../../text/effects";
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
  const showChip = hasPointsToken(obj.text) && !isCurved(obj);
  return (
    <ObjectGroup obj={obj} onGuides={onGuides} onDblClick={onEdit}>
      {showChip ? <VariableGlyphs obj={obj} /> : null}
      {showChip
        ? null
        : nodes.map((node, i) => {
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

function VariableGlyphs({ obj }: { obj: TextObject }) {
  const upper = textTransformOf(obj) === "uppercase";
  const source = upper
    ? splitVariables(obj.text)
        .map((part) => (part.kind === "text" ? part.text.toUpperCase() : POINTS_TOKEN))
        .join("")
    : obj.text;
  const family = fontOf(obj.fontFamily);
  const placed = layoutVariableText(
    source,
    obj.width,
    obj.fontSize,
    lineHeightOf(obj),
    obj.align,
    letterSpacingOf(obj),
    (sample) => measureTextWidth(sample, obj.fontSize, family, obj.fontWeight),
  );
  const stroke = Math.max(1.25, obj.fontSize * 0.045);
  return (
    <>
      {placed.map((part, index) =>
        part.kind === "text" ? (
          <Text
            key={index}
            x={part.x}
            y={part.y}
            text={part.text}
            fontSize={obj.fontSize}
            fontFamily={family}
            fontStyle={String(obj.fontWeight)}
            fill={obj.fill}
            perfectDrawEnabled={false}
          />
        ) : (
          <Group key={index}>
            <Rect
              x={part.x}
              y={part.y}
              width={part.w}
              height={part.h}
              cornerRadius={obj.fontSize * 0.22}
              stroke={obj.fill}
              strokeWidth={stroke}
              perfectDrawEnabled={false}
            />
            <Text
              x={part.x}
              y={part.y + Math.max(0, (part.h - obj.fontSize * 0.72) / 2)}
              width={part.w}
              align="center"
              text={POINTS_LABEL}
              fontSize={obj.fontSize * 0.72}
              fontFamily={family}
              fontStyle="600"
              fill={obj.fill}
              perfectDrawEnabled={false}
            />
          </Group>
        ),
      )}
    </>
  );
}
