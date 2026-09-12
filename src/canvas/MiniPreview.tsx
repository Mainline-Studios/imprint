import type { CSSProperties } from "react";
import { miniTextDecor } from "./textEffects";
import { cssFill, cssImageFilter, cropObjectPosition, isLinearFill } from "../lib/fill";
import { stickerById } from "../library/stickers";
import { previewTextStyle } from "../text/effects";
import type { CanvasObject, Fill } from "../types";

export function MiniPreview({
  width,
  height,
  background,
  objects,
  className,
  assetSrc,
}: {
  width: number;
  height: number;
  background: Fill;
  objects: CanvasObject[];
  className?: string;
  assetSrc?: (assetId: string) => string | undefined;
}) {
  return (
    <div
      className={className ? `mini ${className}` : "mini"}
      style={{ aspectRatio: `${width} / ${height}`, background: cssFill(background) }}
    >
      {objects.map((obj) => {
        if (obj.visible === false) return null;
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
          const src = assetSrc?.(obj.assetId);
          const filter = cssImageFilter(obj.filter);
          const position = cropObjectPosition(obj.crop);
          if (src) {
            return (
              <img
                key={obj.id}
                alt=""
                src={src}
                className="mini-image"
                style={{
                  ...style,
                  height: `${(obj.height / height) * 100}%`,
                  objectFit: "cover",
                  objectPosition: position,
                  filter,
                }}
              />
            );
          }
          return (
            <div
              key={obj.id}
              className="mini-image"
              style={{
                ...style,
                height: `${(obj.height / height) * 100}%`,
                background: "#d8d0c4",
                filter,
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
        if (obj.type === "sticker") {
          const def = stickerById(obj.sticker);
          return (
            <svg
              key={obj.id}
              viewBox={`0 0 ${def?.view ?? 24} ${def?.view ?? 24}`}
              style={{
                ...style,
                height: `${(obj.height / height) * 100}%`,
                overflow: "visible",
              }}
            >
              <path d={def?.path ?? ""} fill={obj.fill} stroke={obj.fill} strokeWidth="0.6" />
            </svg>
          );
        }
        const h = `${(obj.height / height) * 100}%`;
        const fill = cssFill(obj.fill);
        const bgStyle: CSSProperties = isLinearFill(obj.fill)
          ? { backgroundImage: fill }
          : { background: fill };
        if (obj.shape === "ellipse") {
          return (
            <div
              key={obj.id}
              style={{
                ...style,
                height: h,
                ...bgStyle,
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
                ...bgStyle,
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
                ...bgStyle,
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
              ...bgStyle,
              borderRadius: obj.cornerRadius,
              border: obj.strokeWidth ? `1px solid ${obj.stroke}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
