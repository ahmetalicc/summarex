export function formatSeconds(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '00:00';
  const total = Math.floor(value);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  if (h > 0) return `${h.toString().padStart(2, '0')}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}
