import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

interface HeroWaveformProps {
  className?: string;
  barCount?: number;
  variant?: 'hero' | 'compact';
}

export function HeroWaveform({ className, barCount = 96, variant = 'hero' }: HeroWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const bars = Array.from(container.querySelectorAll<HTMLSpanElement>('[data-bar]'));
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
      bars.forEach((bar, i) => {
        bar.style.transform = `scaleY(${0.3 + 0.4 * Math.sin(i * 0.4)})`;
      });
      return;
    }

    const tick = (now: number) => {
      if (startRef.current === 0) startRef.current = now;
      const t = (now - startRef.current) / 1000;
      bars.forEach((bar, i) => {
        const phase = i * 0.14;
        const wave =
          0.35 +
          0.4 * Math.sin(t * 1.7 + phase) +
          0.22 * Math.sin(t * 0.65 + phase * 1.9) +
          0.12 * Math.sin(t * 3.1 + phase * 0.5);
        const clamped = Math.max(0.05, Math.min(1, wave));
        bar.style.transform = `scaleY(${clamped})`;
      });
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [barCount]);

  const barClass =
    variant === 'hero'
      ? 'block h-full w-[3px] rounded-full will-change-transform bg-gradient-to-t from-primary/20 via-primary to-accent'
      : 'block h-full w-[2px] rounded-full will-change-transform bg-primary/70';

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={cn(
        'pointer-events-none flex items-center justify-center gap-[3px]',
        '[mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]',
        className,
      )}
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <span
          key={i}
          data-bar
          style={{ transformOrigin: '50% 50%' }}
          className={barClass}
        />
      ))}
    </div>
  );
}
