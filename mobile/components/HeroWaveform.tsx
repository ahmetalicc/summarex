import { useEffect, useState } from 'react';
import { View, StyleSheet, AccessibilityInfo } from 'react-native';
import type { ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, cancelAnimation,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';

interface HeroWaveformProps {
  height: number;
  barCount?: number;
  style?: StyleProp<ViewStyle>;
}

const BAR_WIDTH = 3;
const BAR_GAP = 3;

function AnimatedBar({
  index, time, primary, accent, height, reduced,
}: {
  index: number;
  time: SharedValue<number>;
  primary: string;
  accent: string;
  height: number;
  reduced: boolean;
}) {
  const phase = index * 0.14;
  // Alternate bar color every 3 bars for a subtle dual-tone effect without gradients.
  const color = index % 3 === 0 ? accent : primary;

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const t = time.value;
    const wave =
      0.35 +
      0.4 * Math.sin(t * 1.7 + phase) +
      0.22 * Math.sin(t * 0.65 + phase * 1.9) +
      0.12 * Math.sin(t * 3.1 + phase * 0.5);
    const clamped = Math.max(0.05, Math.min(1, wave));
    return { transform: [{ scaleY: clamped }] };
  });

  const staticScale = Math.max(0.05, 0.3 + 0.4 * Math.sin(index * 0.4));

  return (
    <Animated.View
      style={[
        { width: BAR_WIDTH, height, borderRadius: BAR_WIDTH / 2, backgroundColor: color },
        reduced ? { transform: [{ scaleY: staticScale }] } : animatedStyle,
      ]}
    />
  );
}

export function HeroWaveform({ height, barCount = 60, style }: HeroWaveformProps) {
  const { colors } = useTheme();
  const time = useSharedValue(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduced(v);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(time);
      return;
    }
    time.value = 0;
    time.value = withRepeat(
      withTiming(600, { duration: 600000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(time);
  }, [reduced, time]);

  return (
    <View style={[styles.row, { height }, style]}>
      {Array.from({ length: barCount }, (_, i) => (
        <AnimatedBar
          key={i}
          index={i}
          time={time}
          primary={colors.primary}
          accent={colors.accent}
          height={height}
          reduced={reduced}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: BAR_GAP,
    overflow: 'hidden',
  },
});
