import { View, Text, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { Eyebrow } from '@/components/ui/Eyebrow';

interface AppHeaderProps {
  eyebrow?: string;
  eyebrowColor?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AppHeader({ eyebrow, eyebrowColor, title, subtitle, right, style }: AppHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.textCol}>
        {eyebrow && <Eyebrow color={eyebrowColor}>{eyebrow}</Eyebrow>}
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
      </View>
      {right && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  textCol: { flex: 1, gap: 6 },
  title: {
    fontFamily: Fonts.display,
    fontSize: 36,
    letterSpacing: -1,
    lineHeight: 40,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 2,
  },
  right: { paddingTop: 4 },
});
