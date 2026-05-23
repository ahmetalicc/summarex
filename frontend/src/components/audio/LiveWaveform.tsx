import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

interface LiveWaveformProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  height?: number;
  className?: string;
}

export function LiveWaveform({
  analyser,
  isActive,
  height = 96,
  className,
}: LiveWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const fadeRef = useRef<number>(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = motionQuery.matches;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let buffer: Uint8Array<ArrayBuffer> | null = null;

    const sizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = canvas.clientWidth || 320;
      const cssHeight = height;
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      canvas.style.height = `${cssHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeCanvas();
    const onResize = () => sizeCanvas();
    window.addEventListener('resize', onResize);

    const drawIdle = (alpha: number) => {
      const w = canvas.clientWidth;
      const h = height;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = Math.max(0.15, alpha);
      ctx.strokeStyle = 'rgba(0, 212, 170, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(8, h / 2);
      ctx.lineTo(w - 8, h / 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    const drawFrame = () => {
      const w = canvas.clientWidth;
      const h = height;
      ctx.clearRect(0, 0, w, h);

      if (!analyser || !isActive || reduced) {
        fadeRef.current = Math.max(0, fadeRef.current - 0.06);
        drawIdle(fadeRef.current);
        if (reduced) return;
        rafRef.current = window.requestAnimationFrame(drawFrame);
        return;
      }

      fadeRef.current = Math.min(1, fadeRef.current + 0.1);

      if (!buffer || buffer.length !== analyser.frequencyBinCount) {
        buffer = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      }
      analyser.getByteFrequencyData(buffer);

      const barCount = Math.min(buffer.length, 64);
      const step = Math.floor(buffer.length / barCount);
      const gap = 2;
      const barWidth = Math.max(2, (w - gap * (barCount - 1)) / barCount);
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(0, 212, 170, 0.95)');
      grad.addColorStop(1, 'rgba(245, 166, 35, 0.85)');
      ctx.fillStyle = grad;

      for (let i = 0; i < barCount; i++) {
        const v = buffer[i * step] / 255;
        const eased = Math.pow(v, 1.4);
        const barHeight = Math.max(2, eased * (h - 8));
        const x = i * (barWidth + gap);
        const y = (h - barHeight) / 2;
        const radius = Math.min(barWidth / 2, 3);
        ctx.beginPath();
        ctx.roundRect?.(x, y, barWidth, barHeight, radius);
        if (!ctx.roundRect) ctx.rect(x, y, barWidth, barHeight);
        ctx.fill();
      }

      rafRef.current = window.requestAnimationFrame(drawFrame);
    };

    if (reduced) {
      drawIdle(0.6);
    } else {
      rafRef.current = window.requestAnimationFrame(drawFrame);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isActive, height]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn('block w-full', className)}
      style={{ height }}
    />
  );
}
