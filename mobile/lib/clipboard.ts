// Copies text to the clipboard. Returns false when expo-clipboard isn't
// available (it works in dev/production builds but not in Expo Go) so the
// caller can fall back to the share sheet.
export async function copyText(text: string): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Clipboard = require('expo-clipboard') as typeof import('expo-clipboard');
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}
