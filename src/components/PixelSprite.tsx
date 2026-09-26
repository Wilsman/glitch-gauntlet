import { useEffect, useRef } from "react";
import { Shape } from "react-konva";
import type Konva from "konva";
import type { CharacterType, PetCoat } from "@shared/types";
import { getPetPreviewFrame, getPortraitFrame } from "@/lib/pixelSprites";

/**
 * Konva node that draws a pixel-art canvas with image smoothing disabled so
 * the art stays crisp at any camera scale. Anchored at its centre.
 */
export function PixelSpriteNode({
  image,
  size,
  pixelScale,
  x = 0,
  y = 0,
  flipX = false,
  rotation = 0,
  opacity = 1,
  scaleY = 1,
  scale = 1,
}: {
  image: HTMLCanvasElement;
  /** Square draw size in world units, or use pixelScale for non-square art. */
  size?: number;
  pixelScale?: number;
  x?: number;
  y?: number;
  flipX?: boolean;
  rotation?: number;
  opacity?: number;
  scaleY?: number;
  /** Uniform scale applied on top of flip / scaleY (squash & stretch). */
  scale?: number;
}) {
  return (
    <Shape
      x={x}
      y={y}
      scaleX={(flipX ? -1 : 1) * scale}
      scaleY={scaleY * scale}
      rotation={rotation}
      opacity={opacity}
      listening={false}
      perfectDrawEnabled={false}
      sceneFunc={(context: Konva.Context) => {
        const ctx = context._context;
        const previous = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        const w = pixelScale ? image.width * pixelScale : (size ?? image.width);
        const h = pixelScale ? image.height * pixelScale : (size ?? image.height);
        ctx.drawImage(image, -w / 2, -h / 2, w, h);
        ctx.imageSmoothingEnabled = previous;
      }}
    />
  );
}

export function PixelPetPortrait({ coat, className }: { coat: PetCoat; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    let lastFrame: HTMLCanvasElement | null = null;
    const draw = () => {
      const frame = getPetPreviewFrame(coat, performance.now());
      if (frame !== lastFrame) {
        canvas.width = frame.width;
        canvas.height = frame.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(frame, 0, 0);
        lastFrame = frame;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [coat]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ imageRendering: "pixelated" }}
      aria-hidden="true"
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
