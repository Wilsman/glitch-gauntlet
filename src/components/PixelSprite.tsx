import { useEffect, useRef } from "react";
import { Shape } from "react-konva";
import type Konva from "konva";
import type { CharacterType } from "@shared/types";
import { getPortraitFrame } from "@/lib/pixelSprites";

/**
 * Konva node that draws a pixel-art canvas with image smoothing disabled so
 * the art stays crisp at any camera scale. Anchored at its centre.
 */
export function PixelSpriteNode({
  image,
  size,
  x = 0,
  y = 0,
  flipX = false,
  rotation = 0,
  opacity = 1,
  scaleY = 1,
}: {
  image: HTMLCanvasElement;
  size: number;
  x?: number;
  y?: number;
  flipX?: boolean;
  rotation?: number;
  opacity?: number;
  scaleY?: number;
}) {
  return (
    <Shape
      x={x}
      y={y}
      scaleX={flipX ? -1 : 1}
      scaleY={scaleY}
      rotation={rotation}
      opacity={opacity}
      listening={false}
      perfectDrawEnabled={false}
      sceneFunc={(context: Konva.Context) => {
        const ctx = context._context;
        const previous = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, -size / 2, -size / 2, size, size);
        ctx.imageSmoothingEnabled = previous;
      }}
    />
  );
}

/** Animated idle portrait rendered to a DOM canvas (menus, HUD). */
export function PixelCharacterPortrait({
  type,
  animated = true,
  className,
}: {
  type: CharacterType;
  animated?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let raf = 0;
    let lastFrame: HTMLCanvasElement | null = null;
    const draw = () => {
      const frame = getPortraitFrame(type, animated ? performance.now() : 0);
      if (frame !== lastFrame) {
        canvas.width = frame.width;
        canvas.height = frame.height;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(frame, 0, 0);
        lastFrame = frame;
      }
      if (animated) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [type, animated]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ imageRendering: "pixelated" }}
      aria-hidden="true"
    />
  );
}
