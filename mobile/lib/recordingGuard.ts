import { Alert } from 'react-native';
import type { TFunction } from 'i18next';

// A recording that exists only on this device (in progress, or stopped but not
// uploaded yet) is lost if the user leaves the recording tab. The recording
// view registers itself here so the tab bar and the Android back button can ask
// for confirmation first.

type Handle = { discard: () => void | Promise<void> };

let active: Handle | null = null;

export function setActiveRecording(handle: Handle | null) {
  active = handle;
}

export function hasActiveRecording(): boolean {
  return active !== null;
}

// Runs `proceed` right away when nothing is at stake, otherwise after the user
// agrees to discard the recording.
export function confirmLeaveRecording(t: TFunction, proceed: () => void) {
  const current = active;
  if (!current) {
    proceed();
    return;
  }
  Alert.alert(t('newRecording.leaveTitle'), t('newRecording.leaveMessage'), [
    { text: t('newRecording.leaveStay'), style: 'cancel' },
    {
      text: t('newRecording.leaveDiscard'),
      style: 'destructive',
      onPress: async () => {
        await current.discard();
        proceed();
      },
    },
  ]);
}
