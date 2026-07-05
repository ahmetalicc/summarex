import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Screens must use these wrappers instead of importing expo-haptics directly:
// ImpactFeedbackStyle is iOS-only at runtime ("Haptics.impactAsync is not
// available on android"), and other calls can still fail silently on some
// Android devices.
export { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';

export function hapticImpact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== 'ios') return;
  void Haptics.impactAsync(style).catch(() => {});
}

export function hapticNotification(type: Haptics.NotificationFeedbackType) {
  void Haptics.notificationAsync(type).catch(() => {});
}

export function hapticSelection() {
  void Haptics.selectionAsync().catch(() => {});
}
