import React, { useEffect, useRef } from 'react';

/**
 * High-performance Silk Waves background replicating the authentic
 * Command Center ambient wave ripple effect.
 */
export const SilkWaves: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Mouse coordinates for interactive wave pull
    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    let t = 0;
    const waveCount = 5;

    const render = () => {
      t += 0.008;
      // Smooth lerp mouse
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Draw subtle luminous wave ribbons
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        const baseHeight = height * (0.35 + w * 0.12);
        const mouseFactor = (mouseY / height - 0.5) * 40;

        ctx.moveTo(0, baseHeight);

        for (let x = 0; x <= width; x += 18) {
          const distToMouse = Math.abs(x - mouseX);
          const mouseWave = Math.exp(-distToMouse / 260) * 28;

          const y =
            baseHeight +
            Math.sin(x * 0.003 + t + w * 1.2) * (26 + w * 8) +
            Math.cos(x * 0.007 - t * 0.8 + w * 0.5) * (18 + w * 4) +
            mouseWave +
            mouseFactor;

          ctx.lineTo(x, y);
        }

        const alpha = 0.035 - w * 0.005;
        ctx.strokeStyle = `rgba(203, 213, 225, ${Math.max(0.012, alpha)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="bg-waves"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.85,
      }}
    />
  );
};
