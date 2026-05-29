import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { CheckIcon, CopyIcon, ShareIcon } from '../layout/Icons';
import { env } from '../../lib/env';
import {
  useCreateShare,
  useDeleteShare,
  useExistingShare,
} from '../../hooks/useShare';

interface ShareModalProps {
  meetingId: string;
  meetingTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

function buildShareUrl(token: string): string {
  const origin = env.APP_URL.replace(/\/+$/, '');
  return `${origin}/shared/${token}`;
}

export function ShareModal({ meetingId, meetingTitle, isOpen, onClose }: ShareModalProps) {
  const { t } = useTranslation();
  const existing = useExistingShare(meetingId);
  const createMutation = useCreateShare(meetingId);
  const deleteMutation = useDeleteShare(meetingId);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const token = createMutation.data?.token ?? existing?.token ?? null;
  const isGenerating = createMutation.isPending && !token;
  const isRevoking = deleteMutation.isPending;

  useEffect(() => {
    if (!isOpen) return;
    if (token || createMutation.isPending) return;
    createMutation.mutate();
    // We only want this to fire when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      setConfirmRevoke(false);
    }
  }, [isOpen]);

  const shareUrl = token ? buildShareUrl(token) : '';

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  const handleRevoke = async () => {
    try {
      await deleteMutation.mutateAsync();
      createMutation.reset();
      setConfirmRevoke(false);
    } catch {
      /* surfaced below */
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('share.title')}
      size="md"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          {t('share.description', { title: meetingTitle })}
        </p>

        {isGenerating && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-elevated/40 p-4 text-sm text-text-muted">
            <Spinner size="sm" className="text-primary" />
            {t('share.generating')}
          </div>
        )}

        {!isGenerating && createMutation.isError && !token && (
          <div className="rounded-xl border border-error/40 bg-error/10 p-3 text-sm text-error">
            {createMutation.error?.message ?? t('errors.networkError')}
            <Button
              variant="secondary"
              size="sm"
              className="ml-3"
              onClick={() => createMutation.mutate()}
            >
              {t('errors.retry')}
            </Button>
          </div>
        )}

        {token && (
          <>
            <div className="flex items-stretch gap-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 rounded-xl border border-border bg-bg-surface px-3 py-2 font-mono text-xs text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button
                variant="secondary"
                onClick={handleCopy}
                leftIcon={
                  copied ? (
                    <CheckIcon width={14} height={14} />
                  ) : (
                    <CopyIcon width={14} height={14} />
                  )
                }
              >
                {copied ? t('share.copied') : t('share.copy')}
              </Button>
            </div>

            <p className="inline-flex items-center gap-2 text-xs text-text-muted">
              <ShareIcon width={12} height={12} />
              {t('share.disclosure')}
            </p>

            {deleteMutation.isError && (
              <p className="text-sm text-error">
                {deleteMutation.error?.message ?? t('errors.networkError')}
              </p>
            )}

            {confirmRevoke ? (
              <div className="flex flex-col gap-3 rounded-xl border border-error/30 bg-error/10 p-4">
                <p className="text-sm text-text">{t('share.revokeConfirm')}</p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setConfirmRevoke(false)}
                    disabled={isRevoking}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleRevoke}
                    isLoading={isRevoking}
                  >
                    {t('share.revoke')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmRevoke(true)}
                >
                  {t('share.revoke')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
