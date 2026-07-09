import { View, Pressable, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  gradient?: boolean;
  pressable?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children, gradient = false, pressable = false, onPress, onLongPress, padding = 20, style,
}: CardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const inner = (
    <View
      style={[
        styles.body,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.border,
          borderWidth: gradient ? 0 : 1,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  const content = gradient ? (
    <View style={[styles.gradientBorder, { borderColor: `rgba(${colors.primaryRgb}, 0.4)` }]}>
      {inner}
    </View>
  ) : (
    inner
  );

  if (!pressable) return content;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => { scale.value = withTiming(0.98, { duration: 90 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  body: { borderRadius: 24 },
  gradientBorder: { borderRadius: 24, borderWidth: 1 },
});
