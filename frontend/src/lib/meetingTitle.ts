import type { TFunction } from 'i18next';

const LEGACY_UNTITLED = new Set([
  'Untitled meeting',
  'Untitled Meeting',
  'Untitled recording',
  'İsimsiz toplantı',
  'İsimsiz kayıt',
]);

export function displayTitle(
  title: string | null | undefined,
  t: TFunction,
): string {
  if (!title || LEGACY_UNTITLED.has(title.trim())) return t('meeting.untitled');
  return title;
}
