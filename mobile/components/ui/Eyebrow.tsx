import { Text, StyleSheet } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';

interface EyebrowProps {
  children: React.ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function Eyebrow({ children, color, style }: EyebrowProps) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.text, { color: color ?? colors.textMuted }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});
