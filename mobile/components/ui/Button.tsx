import { useMemo } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { hapticImpact, ImpactFeedbackStyle } from '@/lib/haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import type { ColorScheme } from '@/constants/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  leftIcon?: IoniconsName;
  rightIcon?: IoniconsName;
  isLoading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const SIZE = {
  sm: { height: 36, font: 13, icon: 16, gap: 6, padH: 16 },
  md: { height: 48, font: 15, icon: 18, gap: 8, padH: 22 },
  lg: { height: 56, font: 16, icon: 20, gap: 10, padH: 28 },
};

function resolveColors(variant: Variant, colors: ColorScheme) {
  switch (variant) {
    case 'primary':
      return { bg: colors.primary, fg: colors.bg, border: 'transparent' };
    case 'accent':
      return { bg: colors.accent, fg: colors.bg, border: 'transparent' };
    case 'secondary':
      return { bg: 'transparent', fg: colors.text, border: colors.borderStrong };
    case 'ghost':
      return { bg: 'transparent', fg: colors.textMuted, border: 'transparent' };
    case 'danger':
      return { bg: colors.error, fg: '#FFFFFF', border: 'transparent' };
  }
}

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  leftIcon, rightIcon, isLoading = false, disabled = false, fullWidth = false, style,
}: ButtonProps) {
  const { colors } = useTheme();
  const dim = SIZE[size];
  const c = resolveColors(variant, colors);
  const blocked = disabled || isLoading;

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const s = useMemo(() => StyleSheet.create({
    base: {
      height: dim.height,
      borderRadius: 999,
      paddingHorizontal: dim.padH,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: dim.gap,
      backgroundColor: c.bg,
      borderWidth: c.border === 'transparent' ? 0 : 1,
      borderColor: c.border,
    },
    label: {
      fontFamily: Fonts.bodySemiBold,
      fontSize: dim.font,
      color: c.fg,
      letterSpacing: 0.2,
    },
  }), [dim, c.bg, c.fg, c.border]);

  function handlePressIn() {
    scale.value = withTiming(0.97, { duration: 90 });
  }
  function handlePressOut() {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  }
  function handlePress() {
    if (blocked) return;
    if (variant === 'primary' || variant === 'accent') {
      hapticImpact(ImpactFeedbackStyle.Medium);
    } else {
      hapticImpact(ImpactFeedbackStyle.Light);
    }
    onPress();
  }

  return (
    <Animated.View style={[animatedStyle, fullWidth && { alignSelf: 'stretch' }, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={blocked}
        style={[s.base, blocked && { opacity: 0.45 }]}
        hitSlop={size === 'sm' ? { top: 8, bottom: 8 } : undefined}
      >
        {isLoading ? (
          <ActivityIndicator color={c.fg} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: dim.gap }}>
            {leftIcon && <Ionicons name={leftIcon} size={dim.icon} color={c.fg} />}
            <Text style={s.label} numberOfLines={1}>{label}</Text>
            {rightIcon && <Ionicons name={rightIcon} size={dim.icon} color={c.fg} />}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
