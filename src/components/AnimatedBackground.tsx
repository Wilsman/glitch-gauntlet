import React, { useEffect, useRef } from "react";

export const AnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width: number;
    let height: number;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener("resize", resize);
    resize();

    // Tron Grid settings
    let gridOffset = 0;
    const gridSpeed = 1.5;
    const gridSpacing = 60;
    const horizon = height * 0.4;

    // Scanline settings
    let scanlineY = 0;
    const scanlineSpeed = 2;

    // Particles
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
    }> = [];

    const createParticle = () => {
      if (particles.length > 50) return;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 2,
        speedY: (Math.random() - 0.5) * 2,
        opacity: Math.random() * 0.5 + 0.2,
      });
    };

    const draw = () => {
      ctx.fillStyle = "#0d0221";
      ctx.fillRect(0, 0, width, height);

      // --- Draw Tron-style Grid ---
      ctx.strokeStyle = "rgba(0, 255, 255, 0.15)";
      ctx.lineWidth = 1;

      // Vertical lines (perspective)
      const numVerticalLines = 40;
      const centerX = width / 2;
      for (let i = -numVerticalLines / 2; i <= numVerticalLines / 2; i++) {
        const xStart = centerX + i * gridSpacing;
        const xEnd = centerX + i * gridSpacing * 4;

        ctx.beginPath();
        ctx.moveTo(xStart, horizon);
        ctx.lineTo(xEnd, height);
        ctx.stroke();
      }

      // Horizontal lines (moving towards viewer)
      gridOffset += gridSpeed;
      if (gridOffset >= gridSpacing) gridOffset = 0;

      for (let y = gridOffset; y < height - horizon; y += gridSpacing) {
        // Perspective scaling for line thickness and opacity
        const progress = y / (height - horizon);
        const currentY = horizon + y;

        ctx.strokeStyle = `rgba(0, 255, 255, ${0.05 + progress * 0.25})`;
        ctx.lineWidth = 1 + progress * 2;

        ctx.beginPath();
        ctx.moveTo(0, currentY);
        ctx.lineTo(width, currentY);
        ctx.stroke();
      }

      // --- Particles ---
      if (Math.random() < 0.1) createParticle();
      particles.forEach((p, index) => {
        p.x += p.x > width / 2 ? p.speedX + 0.5 : p.speedX - 0.5;
        p.y += p.speedY;
        p.opacity -= 0.005;

        if (p.opacity <= 0) {
          particles.splice(index, 1);
        } else {
          ctx.fillStyle = `rgba(255, 0, 255, ${p.opacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // --- Scanline ---
      scanlineY += scanlineSpeed;
      if (scanlineY > height) scanlineY = 0;

      const gradient = ctx.createLinearGradient(
        0,
        scanlineY - 50,
        0,
        scanlineY
      );
      gradient.addColorStop(0, "rgba(0, 255, 255, 0)");
      gradient.addColorStop(0.5, "rgba(0, 255, 255, 0.05)");
      gradient.addColorStop(1, "rgba(0, 255, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, scanlineY - 50, width, 50);

      // --- Glow effect at horizon ---
      const horizonGlow = ctx.createLinearGradient(
        0,
        horizon - 50,
        0,
        horizon + 50
      );
      horizonGlow.addColorStop(0, "rgba(255, 0, 255, 0)");
      horizonGlow.addColorStop(0.5, "rgba(255, 0, 255, 0.1)");
      horizonGlow.addColorStop(1, "rgba(255, 0, 255, 0)");
      ctx.fillStyle = horizonGlow;
      ctx.fillRect(0, horizon - 50, width, 100);

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ filter: "blur(0.5px)" }}
    />
  );
};
