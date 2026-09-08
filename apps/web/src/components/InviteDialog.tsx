import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { demoJoinUrl, getServerUrl, type BackendKind, type MeetingInfo } from '../lib/backend';
import { canShare, shareText } from '../lib/device';
import { useI18n } from '../lib/i18n';
import { schemeLink, webAppLink } from '../lib/links';
import { isCapacitor, isElectron } from '../lib/platform';
import { Badge, Button, CopyRow, Group, Sheet, useToast } from './ui';

export function InviteDialog({ open, onClose, meeting, source, isHost }: { open: boolean; onClose: () => void; meeting: MeetingInfo; source: BackendKind; isHost: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const [qr, setQr] = useState<string | null>(null);

  const appLink = webAppLink(meeting, source === 'selfhosted' ? getServerUrl() : '');
  const browserLink = source === 'demo' ? demoJoinUrl(meeting.id, meeting.type) : appLink;
  const deepLink = isElectron || isCapacitor ? schemeLink(meeting) : null;
  const shareUrl = browserLink || appLink || deepLink || meeting.id;

  useEffect(() => {
    if (!open || !browserLink) return;
    let alive = true;
    QRCode.toDataURL(browserLink, { margin: 1, width: 200, color: { dark: '#1c1c1e', light: '#ffffff' } })
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr(null));
    return () => {
      alive = false;
    };
  }, [open, browserLink]);

  const copied = () => toast(t('toast.copied'), 'success');

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('meeting.inviteTitle')}
      subtitle={meeting.title || undefined}
      leading={<span />}
      trailing={<button className="nav-text-btn bold" onClick={onClose}>{t('action.done')}</button>}
    >
      <Group>
        <CopyRow big icon="hash" label={meeting.ref !== meeting.id ? t('meeting.meetingCode') : t('meeting.meetingId')} value={meeting.displayCode} copyLabel={t('action.copy')} copiedLabel={t('action.copied')} onCopied={copied} />
        {meeting.ref !== meeting.id ? <CopyRow label={t('meeting.meetingId')} value={meeting.id} copyLabel={t('action.copy')} copiedLabel={t('action.copied')} onCopied={copied} /> : null}
        {browserLink ? <CopyRow icon="globe" label={t('meeting.browserLink')} value={browserLink} copyLabel={t('action.copy')} copiedLabel={t('action.copied')} onCopied={copied} /> : null}
        {appLink && appLink !== browserLink ? <CopyRow icon="link" label={t('meeting.appLink')} value={appLink} copyLabel={t('action.copy')} copiedLabel={t('action.copied')} onCopied={copied} /> : null}
        {deepLink ? <CopyRow icon="smartphone" label={t('meeting.appLink')} value={deepLink} copyLabel={t('action.copy')} copiedLabel={t('action.copied')} onCopied={copied} /> : null}
      </Group>
      {qr ? (
        <div className="qr-card">
          <img src={qr} alt="QR" width={160} height={160} />
          <span className="small">{t('invite.qrHint')}</span>
        </div>
      ) : null}
      <p className="hint">{t('meeting.inviteHint')}</p>
      <div className="invite-foot">
        {isHost ? (
          <Badge tone="green" icon="crown">
            {t('meeting.youAreHost')}
          </Badge>
        ) : (
          <span />
        )}
        {canShare() ? (
          <Button
            icon="share"
            onClick={async () => {
              const ok = await shareText({ title: meeting.title || 'CFMeeting', text: `${meeting.title || 'CFMeeting'} · ${meeting.displayCode}`, url: shareUrl });
              if (!ok) toast(t('toast.shareFailed'));
            }}
          >
            {t('action.share')}
          </Button>
        ) : null}
      </div>
    </Sheet>
  );
}
