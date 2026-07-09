import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Keyboard, Pressable, useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { Spacing } from '@/constants/tokens';
import { Brand } from '@/components/Brand';
import { HeroWaveform } from '@/components/HeroWaveform';
import { Eyebrow } from '@/components/ui/Eyebrow';

interface AuthScaffoldProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthScaffold({ eyebrow, title, subtitle, children, footer }: AuthScaffoldProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const brandHeight = Math.max(240, Math.round(height * 0.4));

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bgSurface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
        {/* Brand zone */}
        <View style={[styles.brandZone, { height: brandHeight, backgroundColor: colors.bgSurface }]}>
          <HeroWaveform height={brandHeight} barCount={72} style={styles.waveform} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(${colors.primaryRgb}, 0.15)` }]} />
          <SafeAreaView edges={['top']} style={styles.brandTop}>
            <Brand size="md" />
          </SafeAreaView>
          <View style={styles.brandCopy}>
            <Text style={[styles.headline, { color: colors.text }]}>{t('auth.brandHeadline')}</Text>
            <Eyebrow color={colors.primary} style={{ marginTop: Spacing.sm }}>{t('auth.brandEyebrow')}</Eyebrow>
          </View>
        </View>

        {/* Form zone */}
        <Pressable onPress={Keyboard.dismiss} style={[
          styles.formZone,
          { backgroundColor: colors.bgSurface, borderColor: colors.borderStrong, paddingBottom: insets.bottom + Spacing.xl },
        ]}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
          <View style={styles.form}>{children}</View>
          {footer}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1 },
  brandZone: { overflow: 'hidden', justifyContent: 'flex-start' },
  waveform: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0.35 },
  brandTop: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs },
  // Sits clear of the form sheet, which overlaps the brand zone's bottom 32px.
  brandCopy: { position: 'absolute', bottom: Spacing.xxl, left: Spacing.xl, right: Spacing.xl },
  headline: { fontFamily: Fonts.display, fontSize: 32, letterSpacing: -1, lineHeight: 36 },
  formZone: {
    flex: 1,
    marginTop: -Spacing.xl,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  title: { fontFamily: Fonts.display, fontSize: 28, letterSpacing: -0.5, marginTop: Spacing.sm },
  subtitle: { fontFamily: Fonts.body, fontSize: 15, lineHeight: 22, marginTop: Spacing.xs },
  form: { marginTop: Spacing.lg, gap: Spacing.md },
});
