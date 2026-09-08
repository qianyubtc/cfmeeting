import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BackendError, demoJoinUrl, extractMeetingRef, getBackend, getMode, loadSession, saveSession, type JoinResult, type MeetingInfo, type MeetingType } from '../lib/backend';
import { tapFeedback, writeClipboardText } from '../lib/device';
import { useI18n } from '../lib/i18n';
import { isIOS, openExternal, supportsScreenShare } from '../lib/platform';
import { getItem, getRecentMeetings, rememberMeeting, setItem } from '../lib/storage';
import { Icon } from '../components/Icons';
import { InviteDialog } from '../components/InviteDialog';
import { Layout } from '../components/Layout';
import { MeetingRoom, type LeaveState } from '../components/MeetingRoom';
import { Avatar, Badge, Button, Group, InputRow, Logo, Row, Spinner, useToast } from '../components/ui';

type Phase = { kind: 'prejoin' } | { kind: 'joining' } | { kind: 'in-meeting'; session: JoinResult } | { kind: 'ended'; state: LeaveState } | { kind: 'error'; message: string };

export function MeetingPage() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const params = useParams<{ ref: string }>();
  const [search] = useSearchParams();

  const ref = useMemo(() => extractMeetingRef(params.ref ?? '') ?? (params.ref ?? ''), [params.ref]);
  const typeHint: MeetingType = search.get('t') === 'webinar' ? 'webinar' : 'conference';
  const wantHost = search.get('host') === '1';
  const hostKeyParam = search.get('hk') ?? undefined;
  const nameParam = search.get('name')?.trim() ?? '';
  const autoJoin = search.get('autojoin') === '1';
  const quickStart = search.get('quick') === '1';
  const mode = getMode();

  const recent = useMemo(() => getRecentMeetings().find((m) => m.ref === ref || m.id === ref), [ref]);
  const [name, setName] = useState(() => nameParam || getItem<string>('name', ''));
  const [info, setInfo] = useState<MeetingInfo | null>(null);
  const [phase, setPhase] = useState<Phase>(() => {
    const preview = import.meta.env.DEV ? search.get('preview') : null;
    if (preview === 'ended') return { kind: 'ended', state: 'left' };
    if (preview === 'error') return { kind: 'error', message: t('meeting.notFound') };
    if (preview === 'prejoin') return { kind: 'prejoin' };
    const cached = loadSession(ref);
    return cached ? { kind: 'in-meeting', session: cached } : { kind: 'prejoin' };
  });
  const [invite, setInvite] = useState(false);

  useEffect(() => {
    const backend = getBackend();
    if (!backend || phase.kind !== 'prejoin') return;
    backend
      .lookup(ref)
      .then((m) => m && setInfo(m))
      .catch(() => undefined);
  }, [ref, phase.kind]);

  const errorMessage = useCallback(
    (err: unknown): string => {
      if (err instanceof BackendError) {
        if (err.code === 'not_found') return t('meeting.notFound');
        if (err.code === 'inactive') return t('meeting.inactive');
        if (err.code === 'network') return t('error.network');
        if (err.code === 'not_configured') return t('error.notConfigured');
        if (err.code === 'upstream') return `${t('error.upstream')}: ${err.message}`;
      }
      return `${t('meeting.error')}${err instanceof Error && err.message ? `: ${err.message}` : ''}`;
    },
    [t],
  );

  const effectiveType: MeetingType = info?.type ?? recent?.type ?? typeHint;
  const joinAsHost = wantHost || (recent?.role === 'host' && recent.source === 'demo');
  const title = info?.title || recent?.title || '';
  const displayCode = info?.displayCode || recent?.displayCode || ref;

  const join = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      const backend = getBackend();
      if (!backend) return;
      if (!name.trim()) return setPhase({ kind: 'error', message: t('error.nameRequired') });
      setItem('name', name.trim());
      if (e) tapFeedback();
      setPhase({ kind: 'joining' });
      try {
        const result = await backend.join({ ref, name: name.trim(), type: effectiveType, hostKey: hostKeyParam ?? recent?.hostKey, asHost: joinAsHost });
        if (!result.meeting.title && title) result.meeting.title = title;
        saveSession({ ...result, name: name.trim(), savedAt: Date.now() });
        rememberMeeting({
          id: result.meeting.id,
          ref: result.meeting.ref,
          displayCode: result.meeting.displayCode,
          title: result.meeting.title,
          type: result.meeting.type,
          role: result.isHost ? 'host' : 'participant',
          hostKey: result.hostKey,
          source: result.source,
          lastJoinedAt: Date.now(),
        });
        setPhase({ kind: 'in-meeting', session: result });
      } catch (err) {
        setPhase({ kind: 'error', message: errorMessage(err) });
      }
    },
    [name, ref, effectiveType, joinAsHost, hostKeyParam, recent, title, t, errorMessage],
  );

  useEffect(() => {
    if (mode !== 'embed' || !ref) return;
    rememberMeeting({ id: ref, ref, displayCode: ref, title: recent?.title || '', type: recent?.type ?? typeHint, role: recent?.role ?? 'participant', source: 'demo', lastJoinedAt: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, ref]);

  const [autoJoined, setAutoJoined] = useState(false);
  useEffect(() => {
    if (autoJoin && !autoJoined && phase.kind === 'prejoin' && name.trim() && getBackend()) {
      setAutoJoined(true);
      void join();
    }
  }, [autoJoin, autoJoined, phase.kind, name, join]);

  const onLeft = useCallback((state: LeaveState) => setPhase({ kind: 'ended', state }), []);
  const onError = useCallback((err: Error) => setPhase({ kind: 'error', message: errorMessage(err) }), [errorMessage]);
  const onBack = useCallback(() => navigate('/'), [navigate]);
  const onInvite = useCallback(() => setInvite(true), []);

  /* ---------- browser fallback: embed the official demo ---------- */
  if (mode === 'embed') {
    const url = demoJoinUrl(ref, typeHint);
    const embedInfo: MeetingInfo = { id: ref, ref, displayCode: ref, title: recent?.title || '', type: recent?.type ?? typeHint };
    return (
      <div className="embed-shell">
        <div className="embed-bar">
          <Link to="/" className="brand">
            <Logo size={24} />
            <span className="brand-name">{t('app.name')}</span>
          </Link>
          <span className="embed-hint">{t('embed.joinBar')}</span>
          <Button size="sm" variant="tinted" icon="user-plus" onClick={() => setInvite(true)}>
            {t('ctrl.invite')}
          </Button>
          <Button size="sm" variant="gray" icon="external" onClick={() => openExternal(url)}>
            {t('action.openInBrowser')}
          </Button>
        </div>
        <InviteDialog open={invite} onClose={() => setInvite(false)} meeting={embedInfo} source="demo" isHost={recent?.role === 'host'} />
        <iframe className="embed-frame" src={url} title="Cloudflare Realtime demo" allow="camera; microphone; display-capture; autoplay; fullscreen; clipboard-write; picture-in-picture" allowFullScreen />
        {isIOS ? <div className="embed-foot muted small">{t('embed.permissionHint')}</div> : null}
      </div>
    );
  }

  /* ---------- in meeting (setup → room) ---------- */
  if (phase.kind === 'in-meeting') {
    const { session } = phase;
    return (
      <>
        <MeetingRoom token={session.token} lang={lang} meetingInfo={session.meeting} isHost={session.isHost} connectingLabel={t('meeting.connecting')} onInvite={onInvite} onBack={onBack} onLeft={onLeft} onError={onError} autoStart={quickStart} />
        <InviteDialog open={invite} onClose={() => setInvite(false)} meeting={session.meeting} source={session.source} isHost={session.isHost} />
      </>
    );
  }

  /* ---------- pre-join / joining / ended / error ---------- */
  return (
    <Layout>
      <div className="stage">
        {phase.kind === 'joining' ? (
          <div className="stage-center">
            <Avatar name={name || '?'} size={64} />
            <h1>{t('meeting.joining')}</h1>
            <p className="muted">{title || displayCode}</p>
            <Spinner />
          </div>
        ) : phase.kind === 'ended' ? (
          <div className="stage-center">
            <span className="stage-icon">
              <Icon name={phase.state === 'kicked' || phase.state === 'rejected' ? 'alert' : 'phone-off'} size={28} />
            </span>
            <h1>{endedTitle(phase.state, t)}</h1>
            {title ? <p className="muted">{title}</p> : null}
            <div className="stage-actions">
              <Button variant="gray" icon="arrow-left" onClick={() => navigate('/')}>
                {t('action.back')}
              </Button>
              {phase.state !== 'ended' && phase.state !== 'kicked' && phase.state !== 'rejected' ? (
                <Button icon="refresh" onClick={() => setPhase({ kind: 'prejoin' })}>
                  {t('action.rejoin')}
                </Button>
              ) : null}
            </div>
          </div>
        ) : phase.kind === 'error' ? (
          <div className="stage-center">
            <span className="stage-icon stage-icon-danger">
              <Icon name="alert" size={28} />
            </span>
            <h1>{t('meeting.error')}</h1>
            <p className="form-error">{phase.message}</p>
            <div className="stage-actions">
              <Button variant="gray" icon="arrow-left" onClick={() => navigate('/')}>
                {t('action.back')}
              </Button>
              <Button icon="refresh" onClick={() => setPhase({ kind: 'prejoin' })}>
                {t('action.retry')}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={join} className="sheet-form">
            <div className="prejoin-head">
              <Avatar name={title || displayCode} size={52} square />
              <div>
                <div className="muted small">{t('meeting.preparing')}</div>
                <h1>{title || t('home.joinTitle')}</h1>
              </div>
            </div>
            <Group>
              <Row icon="hash" iconTone="indigo" label={t('meeting.meetingId')} value={<code>{displayCode.length > 20 ? `${displayCode.slice(0, 8)}…${displayCode.slice(-4)}` : displayCode}</code>} onClick={async () => (await writeClipboardText(displayCode)) && toast(t('toast.copied'), 'success')} />
              <Row icon={effectiveType === 'webinar' ? 'presentation' : 'video'} iconTone="blue" label={t('form.type')} value={t(`form.type.${effectiveType}`)} />
              <Row icon={joinAsHost ? 'crown' : 'user'} iconTone={joinAsHost ? 'orange' : 'gray'} label={t('meeting.asHost')} value={<Badge tone={joinAsHost ? 'blue' : 'gray'}>{joinAsHost ? t('meeting.asHost') : t('meeting.asGuest')}</Badge>} />
            </Group>
            <Group>
              <InputRow icon="user" iconTone="blue" label={t('form.yourName')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('form.yourNamePlaceholder')} autoFocus maxLength={40} />
            </Group>
            <p className="hint">
              <Icon name="info" size={14} /> {t('meeting.deviceHint')}
              {!supportsScreenShare ? ` ${t('meeting.screenShareUnsupported')}` : ''}
            </p>
            <div className="sheet-actions">
              <Button type="button" variant="gray" onClick={() => navigate('/')}>
                {t('action.cancel')}
              </Button>
              <Button type="submit" size="lg" iconRight="arrow-right">
                {t('action.join')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}

function endedTitle(state: LeaveState, t: (k: 'meeting.ended' | 'meeting.left' | 'meeting.kicked' | 'meeting.rejected' | 'meeting.disconnected') => string): string {
  switch (state) {
    case 'ended':
      return t('meeting.ended');
    case 'kicked':
      return t('meeting.kicked');
    case 'rejected':
      return t('meeting.rejected');
    case 'disconnected':
    case 'failed':
      return t('meeting.disconnected');
    default:
      return t('meeting.left');
  }
}
