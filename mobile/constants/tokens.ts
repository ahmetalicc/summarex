// Signal Green v2 — spacing & radius scale (base 4)
export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  '3xl': 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 999,
} as const;

// Content screens sit above the floating tab bar — offset scroll content by this
// (bar height + bottom inset gap) so the last item clears the frosted bar.
export const TAB_BAR_OFFSET = 104;
