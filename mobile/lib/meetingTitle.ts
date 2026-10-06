import type { TFunction } from 'i18next';

// Titles the backend/older clients used to store as a default. They should be
// shown in the viewer's language rather than as the stored string.
const LEGACY_UNTITLED = new Set([
  'Untitled meeting',
  'Untitled Meeting',
  'Untitled recording',
  'İsimsiz toplantı',
  'İsimsiz kayıt',
]);

export function isUntitled(title: string | null | undefined): boolean {
  return !title || title.trim() === '' || LEGACY_UNTITLED.has(title.trim());
}

export function displayTitle(title: string | null | undefined, t: TFunction): string {
  if (isUntitled(title)) return t('recordings.untitled');
  return title as string;
}
