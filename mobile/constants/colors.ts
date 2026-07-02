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
    bg: '#0A0F1C',
    bgSurface: '#141B2D',
    bgElevated: '#1B2236',
    primary: '#2AB48F',
    primaryHover: '#1CA687',
    accent: '#F5A623',
    text: '#E2E8F0',
    textMuted: '#94A3B8',
    border: '#1E293B',
    error: '#EF4444',
    success: '#10B981',
  },
  light: {
    bg: '#F7F8FA',
    bgSurface: '#FFFFFF',
    bgElevated: '#F1F5F9',
    primary: '#2AB48F',
    primaryHover: '#1CA687',
    accent: '#F5A623',
    text: '#0F172A',
    textMuted: '#64748B',
    border: '#E2E8F0',
    error: '#EF4444',
    success: '#10B981',
  },
};
