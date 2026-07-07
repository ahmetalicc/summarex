export interface ColorScheme {
  bg: string;
  bgSurface: string;
  bgElevated: string;
  primary: string;
  primaryHover: string;
  accent: string;
  text: string;
  textMuted: string;
  border: string;
  error: string;
  success: string;
}

export const Colors: { dark: ColorScheme; light: ColorScheme } = {
  dark: {
    bg: '#0F130F',
    bgSurface: '#1A221A',
    bgElevated: '#1F281F',
    primary: '#2AB48F',
    primaryHover: '#239A7A',
    accent: '#F59E0B',
    text: '#F9FAFB',
    textMuted: '#9CA3AF',
    border: '#2A342A',
    error: '#EF4444',
    success: '#22C55E',
  },
  light: {
    bg: '#EEF4EE',
    bgSurface: '#FFFFFF',
    bgElevated: '#F5F9F5',
    primary: '#2AB48F',
    primaryHover: '#239A7A',
    accent: '#F59E0B',
    text: '#111827',
    textMuted: '#6B7280',
    border: '#E5EBE5',
    error: '#DC2626',
    success: '#16A34A',
  },
};
