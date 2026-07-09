export interface ColorScheme {
  bg: string;
  bgSurface: string;
  bgElevated: string;
  primary: string;
  primaryHover: string;
  primaryDeep: string;
  accent: string;
  accentHover: string;
  text: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  error: string;
  success: string;
  primaryRgb: string;
  accentRgb: string;
}

export const Colors: { dark: ColorScheme; light: ColorScheme } = {
  dark: {
    bg: '#0A0E0D',
    bgSurface: '#121816',
    bgElevated: '#1A221F',
    primary: '#2FD594',
    primaryHover: '#4CE2A8',
    primaryDeep: '#149564',
    accent: '#C6F94D',
    accentHover: '#D6FD6C',
    text: '#EDF4F0',
    textMuted: '#8E9E98',
    border: '#222C28',
    borderStrong: '#34423C',
    error: '#EF4444',
    success: '#2FD594',
    primaryRgb: '47, 213, 148',
    accentRgb: '198, 249, 77',
  },
  light: {
    bg: '#F4F3EF',
    bgSurface: '#FCFBF7',
    bgElevated: '#ECEAE3',
    primary: '#149564',
    primaryHover: '#108255',
    primaryDeep: '#0C6441',
    accent: '#84C31E',
    accentHover: '#6CA816',
    text: '#121916',
    textMuted: '#586860',
    border: '#DDDAD2',
    borderStrong: '#C8C4BA',
    error: '#DC2626',
    success: '#149564',
    primaryRgb: '20, 149, 100',
    accentRgb: '132, 195, 30',
  },
};
