import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface BrandProps {
  size?: 'sm' | 'md' | 'lg';
}

const SIZE = {
  sm: { img: 24, imgRadius: 7, text: 16 },
  md: { img: 32, imgRadius: 9, text: 20 },
  lg: { img: 48, imgRadius: 13, text: 28 },
};

export function Brand({ size = 'md' }: BrandProps) {
  const d = SIZE[size];
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

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  img: {},
  text: { fontWeight: '700', letterSpacing: -0.5 },
  textDark: { color: Colors.dark.text },
  textGreen: { color: Colors.dark.primary },
});
