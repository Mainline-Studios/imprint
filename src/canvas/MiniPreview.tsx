import type { CSSProperties } from "react";
import { miniTextDecor } from "./textEffects";
import { previewTextStyle } from "../text/effects";
import type { CanvasObject } from "../types";

export function MiniPreview({
  width,
  height,
  background,
  objects,
  className,
}: {
  width: number;
  height: number;
  background: string;
  objects: CanvasObject[];
  className?: string;
}) {
  return (
    <div
      className={className ? `mini ${className}` : "mini"}
      style={{ aspectRatio: `${width} / ${height}`, background }}
    >
      {objects.map((obj) => {
        const style: CSSProperties = {
          position: "absolute",
          left: `${(obj.x / width) * 100}%`,
          top: `${(obj.y / height) * 100}%`,
          width: `${(obj.width / width) * 100}%`,
          transform: `rotate(${obj.rotation}deg)`,
          transformOrigin: "top left",
          opacity: obj.opacity,
          pointerEvents: "none",
          overflow: "hidden",
        };
        if (obj.type === "text") {
          return (
            <div key={obj.id} style={{ ...style, ...previewTextStyle(obj, height), ...miniTextDecor(obj) }}>
              {obj.text}
            </div>
          );
        }
        if (obj.type === "image") {
          return (
            <div
              key={obj.id}
              className="mini-image"
              style={{
                ...style,
                height: `${(obj.height / height) * 100}%`,
                background: "#d8d0c4",
              }}
            />
          );
        }
        if (obj.type === "button") {
          return (
            <div
              key={obj.id}
              style={{
                ...style,
                height: `${(obj.height / height) * 100}%`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: obj.fill,
                color: obj.textFill,
                borderRadius: obj.cornerRadius,
                fontFamily: obj.fontFamily,
                fontSize: Math.max(8, (obj.fontSize / height) * 120),
                fontWeight: obj.fontWeight,
                overflow: "hidden",
              }}
            >
              {obj.text}
            </div>
          );
        }
        const h = `${(obj.height / height) * 100}%`;
        if (obj.shape === "ellipse") {
          return (
            <div
              key={obj.id}
              style={{
                ...style,
                height: h,
                background: obj.fill,
                borderRadius: "50%",
                border: obj.strokeWidth ? `${obj.strokeWidth}px solid ${obj.stroke}` : undefined,
              }}
            />
          );
        }
        if (obj.shape === "triangle") {
          return (
            <div
              key={obj.id}
              style={{
                ...style,
                height: h,
                background: obj.fill,
                clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
              }}
            />
          );
        }
        if (obj.shape === "line") {
          return (
            <div
              key={obj.id}
              style={{
                ...style,
                height: h,
                background: obj.fill,
                borderRadius: 99,
              }}
            />
          );
        }
        return (
          <div
            key={obj.id}
            style={{
              ...style,
              height: h,
              background: obj.fill,
              borderRadius: obj.cornerRadius,
              border: obj.strokeWidth ? `1px solid ${obj.stroke}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
