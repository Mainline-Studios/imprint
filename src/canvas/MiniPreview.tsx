import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 0.05, x: 0, y: 0 });

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => {
      const sx = el.clientWidth / width;
      const sy = el.clientHeight / height;
      const scale = Math.min(sx, sy);
      if (!Number.isFinite(scale) || scale <= 0) {
        setFit({ scale: 0.05, x: 0, y: 0 });
        return;
      }
      setFit({
        scale,
        x: (el.clientWidth - width * scale) / 2,
        y: (el.clientHeight - height * scale) / 2,
      });
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);

  return (
    <div
      ref={wrapRef}
      className={className ? `mini ${className}` : "mini"}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <div
        className="mini-stage"
        style={{
          left: fit.x,
          top: fit.y,
          width,
          height,
          background: cssFill(background),
          transform: `scale(${fit.scale})`,
          transformOrigin: "top left",
        }}
      >
        {objects.map((obj) => {
          if (obj.visible === false) return null;
          const style: CSSProperties = {
            position: "absolute",
            left: obj.x,
            top: obj.y,
            width: obj.width,
            transform: `rotate(${obj.rotation}deg)`,
            transformOrigin: "top left",
            opacity: obj.opacity,
            pointerEvents: "none",
            overflow: "hidden",
          };
          if (obj.type === "text") {
            return (
              <div key={obj.id} style={{ ...style, ...previewTextStyle(obj), ...miniTextDecor(obj) }}>
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
                    height: obj.height,
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
                  height: obj.height,
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
                  height: obj.height,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: obj.fill,
                  color: obj.textFill,
                  borderRadius: obj.cornerRadius,
                  fontFamily: obj.fontFamily,
                  fontSize: obj.fontSize,
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
                  height: obj.height,
                  overflow: "visible",
                }}
              >
                <path d={def?.path ?? ""} fill={obj.fill} stroke={obj.fill} strokeWidth="0.6" />
              </svg>
            );
          }
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
                  height: obj.height,
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
                  height: obj.height,
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
                  height: obj.height,
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
                height: obj.height,
                ...bgStyle,
                borderRadius: obj.cornerRadius,
                border: obj.strokeWidth ? `${obj.strokeWidth}px solid ${obj.stroke}` : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
