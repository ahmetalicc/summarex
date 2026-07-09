import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import type { TextInputProps, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface InputProps extends TextInputProps {
  label?: string;
  leftIcon?: IoniconsName;
  passwordToggle?: boolean;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label, leftIcon, passwordToggle = false, error, containerStyle,
  secureTextEntry, ...props
}: InputProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(passwordToggle || secureTextEntry);

  const borderColor = error ? colors.error : focused ? colors.primary : colors.border;

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      )}
      <View style={[styles.field, { borderColor, backgroundColor: colors.bgElevated }]}>
        {leftIcon && (
          <Ionicons name={leftIcon} size={18} color={focused ? colors.primary : colors.textMuted} />
        )}
        <TextInput
          {...props}
          secureTextEntry={passwordToggle ? hidden : secureTextEntry}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          style={[styles.input, { color: colors.text }]}
        />
        {passwordToggle && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Text style={[styles.toggle, { color: colors.textMuted }]}>
              {hidden ? t('common.show') : t('common.hide')}
            </Text>
          </Pressable>
        )}
      </View>
      {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  field: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 15,
    padding: 0,
  },
  toggle: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 13,
    marginTop: 6,
  },
});
