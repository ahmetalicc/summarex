import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

interface HeroWaveformProps {
  className?: string;
  barCount?: number;
}

export function HeroWaveform({ className, barCount = 64 }: HeroWaveformProps) {
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
        const phase = i * 0.18;
        const wave =
          0.45 +
          0.35 * Math.sin(t * 1.6 + phase) +
          0.18 * Math.sin(t * 0.9 + phase * 1.7);
        const clamped = Math.max(0.08, Math.min(1, wave));
        bar.style.transform = `scaleY(${clamped})`;
      });
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [barCount]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={cn(
        'pointer-events-none flex h-full w-full items-center justify-center gap-[3px]',
        '[mask-image:linear-gradient(90deg,transparent,#000_18%,#000_82%,transparent)]',
        className,
      )}
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <span
          key={i}
          data-bar
          style={{ transformOrigin: '50% 50%' }}
          className="block h-24 w-[3px] rounded-full bg-gradient-to-b from-primary via-primary/60 to-primary-hover/40 opacity-70 will-change-transform"
        />
      ))}
    </div>
  );
}
