import { View, Text, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import type { ColorScheme } from '@/constants/colors';

type Variant = 'neutral' | 'info' | 'accent' | 'success' | 'warning' | 'error';

interface BadgeProps {
  label: string;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
}

function tone(variant: Variant, colors: ColorScheme): string {
  switch (variant) {
    case 'neutral': return colors.textMuted;
    case 'info': return colors.primary;
    case 'accent': return colors.accent;
    case 'success': return colors.success;
    case 'warning': return colors.accent;
    case 'error': return colors.error;
  }
}

// Hex color + alpha suffix for translucent fills.
function withAlpha(hex: string, alpha: string) {
  return hex + alpha;
}

export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  const { colors } = useTheme();
  const color = tone(variant, colors);

  return (
    <View style={[styles.pill, { backgroundColor: withAlpha(color, '1F') }, style]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
