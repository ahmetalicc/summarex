import { useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ActivityIndicator, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { copyText } from '@/lib/clipboard';
import { hapticImpact, hapticNotification, NotificationFeedbackType } from '@/lib/haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { Spacing } from '@/constants/tokens';
import { Button } from '@/components/ui';
import type { ColorScheme } from '@/constants/colors';

const SHARE_ORIGIN = 'https://summarex.app';

type Phase = 'loading' | 'ready' | 'error' | 'revoked';

interface ShareSheetProps {
  visible: boolean;
  meetingId: string;
  title: string;
  onClose: () => void;
}

// Bottom sheet that creates (or re-uses; the endpoint is idempotent) the public
// link for a meeting, tells the user who can open it, and lets them revoke it.
export function ShareSheet({ visible, meetingId, title, onClose }: ShareSheetProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createStyles(colors), [colors]);

  const [phase, setPhase] = useState<Phase>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setPhase('loading');
    setToken(null);
    setError(null);
    setConfirmRevoke(false);
    setCopied(false);
    api.meetings.share.create(meetingId)
      .then(({ token: tk }) => {
        if (cancelled) return;
        setToken(tk);
        setPhase('ready');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError((e as Error).message);
        setPhase('error');
      });
    return () => { cancelled = true; };
  }, [visible, meetingId, attempt]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const url = token ? `${SHARE_ORIGIN}/shared/${token}` : '';

  async function handleCopy() {
    if (!url) return;
    hapticImpact();
    if (await copyText(url)) {
      hapticNotification(NotificationFeedbackType.Success);
      setCopied(true);
    } else {
      // No clipboard module (Expo Go): the share sheet lets the user copy from there.
      await Share.share({ message: url, url }).catch(() => {});
    }
  }

  async function handleSend() {
    if (!url) return;
    await Share.share({ message: url, url }).catch(() => {});
  }

  async function handleRevoke() {
    setRevoking(true);
    setError(null);
    try {
      await api.meetings.share.revoke(meetingId);
      setPhase('revoked');
    } catch (e: unknown) {
      // 404 = there is no active link any more, which is the state we wanted.
      if ((e as { status?: number }).status === 404) {
        setPhase('revoked');
      } else {
        setError((e as Error).message);
      }
    } finally {
      setRevoking(false);
      setConfirmRevoke(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.root}>
        <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel={t('meeting.close')} />
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.sm }]}>
          <View style={s.handle} />
          <Text style={s.title}>{t('meeting.shareTitle')}</Text>

          {phase === 'loading' && (
            <View style={s.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={s.muted}>{t('meeting.shareGenerating')}</Text>
            </View>
          )}

          {phase === 'error' && (
            <View style={s.block}>
              <Text style={s.errorText}>{error}</Text>
              <Button label={t('common.retry')} variant="secondary" onPress={() => setAttempt((n) => n + 1)} />
            </View>
          )}

          {phase === 'revoked' && (
            <View style={s.block}>
              <View style={s.revokedRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={s.body}>{t('meeting.shareRevoked')}</Text>
              </View>
              <Button label={t('meeting.close')} variant="secondary" onPress={onClose} />
            </View>
          )}

          {phase === 'ready' && (
            <View style={s.block}>
              <Text style={s.body}>{t('meeting.shareDescription', { title })}</Text>

              <View style={s.urlBox}>
                <Text style={s.urlText} numberOfLines={1} selectable>{url}</Text>
              </View>

              <View style={s.disclosureRow}>
                <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} style={s.disclosureIcon} />
                <Text style={s.disclosureText}>{t('meeting.shareDisclosure')}</Text>
              </View>

              <View style={s.actionsRow}>
                <View style={s.actionItem}>
                  <Button
                    label={copied ? t('meeting.shareCopied') : t('meeting.shareCopyLink')}
                    variant="secondary"
                    leftIcon={copied ? 'checkmark' : 'copy-outline'}
                    fullWidth
                    onPress={handleCopy}
                  />
                </View>
                <View style={s.actionItem}>
                  <Button
                    label={t('meeting.shareSend')}
                    variant="primary"
                    leftIcon="share-outline"
                    fullWidth
                    onPress={handleSend}
                  />
                </View>
              </View>

              {error ? <Text style={s.errorText}>{error}</Text> : null}

              {confirmRevoke ? (
                <View style={s.revokeBox}>
                  <Text style={s.body}>{t('meeting.shareRevokeConfirm')}</Text>
                  <View style={s.actionsRow}>
                    <View style={s.actionItem}>
                      <Button
                        label={t('common.cancel')}
                        variant="secondary"
                        fullWidth
                        disabled={revoking}
                        onPress={() => setConfirmRevoke(false)}
                      />
                    </View>
                    <View style={s.actionItem}>
                      <Button
                        label={t('meeting.shareRevoke')}
                        variant="danger"
                        fullWidth
                        isLoading={revoking}
                        onPress={handleRevoke}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <Button
                  label={t('meeting.shareRevoke')}
                  variant="ghost"
                  size="sm"
                  onPress={() => { setError(null); setConfirmRevoke(true); }}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: {
      backgroundColor: colors.bgSurface,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      borderWidth: 1, borderBottomWidth: 0, borderColor: colors.border,
      paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm,
    },
    handle: {
      alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
      backgroundColor: colors.borderStrong, marginBottom: Spacing.md,
    },
    title: { fontSize: 22, fontFamily: Fonts.display, color: colors.text, letterSpacing: -0.4, marginBottom: Spacing.sm },
    block: { gap: Spacing.md },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
    muted: { fontSize: 14, fontFamily: Fonts.body, color: colors.textMuted },
    body: { flex: 1, fontSize: 15, fontFamily: Fonts.body, color: colors.text, lineHeight: 22 },
    errorText: { fontSize: 13, fontFamily: Fonts.body, color: colors.error, lineHeight: 20 },
    urlBox: {
      backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: Spacing.md, paddingVertical: 12,
    },
    urlText: { fontSize: 12, fontFamily: Fonts.mono, color: colors.text },
    disclosureRow: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'flex-start' },
    disclosureIcon: { marginTop: 1 },
    disclosureText: { flex: 1, fontSize: 12, fontFamily: Fonts.body, color: colors.textMuted, lineHeight: 18 },
    actionsRow: { flexDirection: 'row', gap: Spacing.sm },
    actionItem: { flex: 1 },
    revokeBox: {
      gap: Spacing.md, padding: Spacing.md, borderRadius: 16,
      backgroundColor: colors.error + '12', borderWidth: 1, borderColor: colors.error + '40',
    },
    revokedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  });
}
