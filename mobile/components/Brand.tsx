import { useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface BrandProps {
  size?: 'sm' | 'md' | 'lg';
}

const SIZE = {
  sm: { img: 24, imgRadius: 7, text: 16 },
  md: { img: 32, imgRadius: 9, text: 20 },
  lg: { img: 48, imgRadius: 13, text: 28 },
};

export function Brand({ size = 'md' }: BrandProps) {
  const { colors } = useTheme();
  const d = SIZE[size];

  const s = useMemo(() => StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    img: {},
    text: { fontWeight: '700', letterSpacing: -0.5 },
    textDark: { color: colors.text },
    textGreen: { color: colors.primary },
  }), [colors]);

  return (
    <View style={s.row}>
      <Image
        source={require('@/assets/images/brand-mark.png')}
        style={[s.img, { width: d.img, height: d.img, borderRadius: d.imgRadius }]}
        resizeMode="contain"
      />
      <Text style={[s.text, { fontSize: d.text }]}>
        <Text style={s.textDark}>Summa</Text>
        <Text style={s.textGreen}>rex</Text>
      </Text>
    </View>
  );
}
