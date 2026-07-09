import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { Button } from './Button';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
  icon: IoniconsName;
  title: string;
  subtitle?: string;
  tone?: 'primary' | 'accent';
  actionLabel?: string;
  actionIcon?: IoniconsName;
  onAction?: () => void;
}

export function EmptyState({
  icon, title, subtitle, tone = 'primary', actionLabel, actionIcon, onAction,
}: EmptyStateProps) {
  const { colors } = useTheme();
  const accentColor = tone === 'accent' ? colors.accent : colors.primary;
  const rgb = tone === 'accent' ? colors.accentRgb : colors.primaryRgb;

  return (
    <View style={[styles.wrap, { borderColor: colors.border }]}>
      <View style={[styles.topLine, { backgroundColor: `rgba(${rgb}, 0.4)` }]} />
      <View style={[styles.iconSquare, { backgroundColor: `rgba(${rgb}, 0.14)` }]}>
        <Ionicons name={icon} size={26} color={accentColor} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <View style={styles.action}>
          <Button
            label={actionLabel}
            onPress={onAction}
            variant={tone === 'accent' ? 'accent' : 'primary'}
            leftIcon={actionIcon}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 28,
    paddingVertical: 40,
    paddingHorizontal: 28,
    alignItems: 'center',
    overflow: 'hidden',
  },
  topLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  iconSquare: {
    width: 48, height: 48,
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 280,
  },
  action: { marginTop: 24 },
});
