import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BackendError, demoLobbyUrl, extractMeetingRef, extractTypeHint, getBackend, getMode, saveSession, type MeetingType } from '../lib/backend';
import { readClipboardText, relativeTime, tapFeedback } from '../lib/device';
import { useI18n } from '../lib/i18n';
import { openExternal } from '../lib/platform';
import { forgetMeeting, getItem, getRecentMeetings, rememberMeeting, setItem, type RecentMeeting } from '../lib/storage';
import { Icon } from '../components/Icons';
import { Layout } from '../components/Layout';
import { InviteDialog } from '../components/InviteDialog';
import { Avatar, Badge, Button, Group, IconButton, InputRow, Row, Sheet, Switch, useToast } from '../components/ui';
import type { MeetingInfo } from '../lib/backend';

type SheetKind = 'join' | 'create' | null;

export function Home() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const mode = getMode();

  const [search] = useSearchParams();
  const [sheet, setSheet] = useState<SheetKind>(() => (search.get('sheet') === 'join' || (search.get('sheet') === 'create' && mode !== 'embed') ? (search.get('sheet') as SheetKind) : null));
  const [name, setName] = useState(() => getItem<string>('name', ''));
  const [ref, setRef] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MeetingType>('conference');
  const [asHost, setAsHost] = useState(false);
  const [accessCode, setAccessCode] = useState(() => getItem<string>('accessCode', ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [embedCreate, setEmbedCreate] = useState(() => mode === 'embed' && search.get('sheet') === 'create');
  const [embedLink, setEmbedLink] = useState('');
  const [embedInvite, setEmbedInvite] = useState<MeetingInfo | null>(null);
  const [recent, setRecent] = useState<RecentMeeting[]>(() => getRecentMeetings());

  useEffect(() => setItem('name', name), [name]);
  useEffect(() => setItem('accessCode', accessCode), [accessCode]);
  useEffect(() => setError(null), [sheet]);

  const parsedRef = useMemo(() => extractMeetingRef(ref), [ref]);
  const detectedType = useMemo(() => extractTypeHint(ref), [ref]);
  const today = useMemo(() => new Date().toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en', { month: 'long', day: 'numeric', weekday: 'long' }), [lang]);

  const errorMessage = (err: unknown): string => {
    if (err instanceof BackendError) {
      switch (err.code) {
        case 'not_found':
          return t('meeting.notFound');
        case 'inactive':
          return t('meeting.inactive');
        case 'network':
          return t('error.network');
        case 'access_code_required':
          return t('error.accessCode');
        case 'name_required':
          return t('error.nameRequired');
        case 'not_configured':
          return t('error.notConfigured');
        case 'upstream':
          return `${t('error.upstream')}: ${err.message}`;
        default:
          return t('error.generic');
      }
    }
    return t('error.generic');
  };

  const paste = async () => {
    const text = await readClipboardText();
    if (text) {
      setRef(text);
      toast(t('action.pasted'), 'success');
    } else toast(t('action.pasteFailed'), 'error');
  };

  const onJoin = (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!name.trim()) return setError(t('error.nameRequired'));
    if (!parsedRef) return setError(ref.trim() ? t('error.invalidRef') : t('error.refRequired'));
    tapFeedback();
    const finalType = detectedType ?? type;
    const params = new URLSearchParams({ autojoin: '1' });
    if (finalType === 'webinar') params.set('t', 'webinar');
    if (asHost && mode === 'demo') params.set('host', '1');
    navigate(`/m/${encodeURIComponent(parsedRef)}?${params.toString()}`);
  };

  const onCreate = async (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!name.trim()) return setError(t('error.nameRequired'));
    if (mode === 'embed') {
      setSheet(null);
      setEmbedCreate(true);
      return;
    }
    const backend = getBackend();
    if (!backend) return;
    tapFeedback();
    setBusy(true);
    try {
      const result = await backend.create({ name: name.trim(), title: title.trim(), type, accessCode: accessCode || undefined });
      saveSession({ ...result, name: name.trim(), savedAt: Date.now() });
      rememberMeeting({
        id: result.meeting.id,
        ref: result.meeting.ref,
        displayCode: result.meeting.displayCode,
        title: result.meeting.title,
        type: result.meeting.type,
        role: 'host',
        hostKey: result.hostKey,
        source: result.source,
        lastJoinedAt: Date.now(),
      });
      navigate(`/m/${encodeURIComponent(result.meeting.ref)}${type === 'webinar' ? '?t=webinar' : ''}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const rejoin = (m: RecentMeeting) => {
    const params = new URLSearchParams({ autojoin: '1' });
    if (m.type === 'webinar') params.set('t', 'webinar');
    if (m.role === 'host' && m.source === 'demo') params.set('host', '1');
    if (m.role === 'host' && m.hostKey) params.set('hk', m.hostKey);
    navigate(`/m/${encodeURIComponent(m.ref)}?${params.toString()}`);
  };

  const remove = (m: RecentMeeting) => {
    forgetMeeting(m.id);
    setRecent(getRecentMeetings());
  };

  const statusKey = mode === 'demo' ? 'home.statusDemo' : mode === 'selfhosted' ? 'home.statusSelfhosted' : 'home.statusEmbed';
  const embedParsed = useMemo(() => extractMeetingRef(embedLink), [embedLink]);
  const pasteEmbed = async () => {
    const text = await readClipboardText();
    if (text) setEmbedLink(text);
    else toast(t('action.pasteFailed'), 'error');
  };
  const saveEmbedMeeting = () => {
    if (!embedParsed) return;
    const finalType = extractTypeHint(embedLink) ?? type;
    const info: MeetingInfo = { id: embedParsed, ref: embedParsed, displayCode: embedParsed, title: title.trim(), type: finalType };
    rememberMeeting({ id: info.id, ref: info.ref, displayCode: info.displayCode, title: info.title, type: info.type, role: 'host', source: 'demo', lastJoinedAt: Date.now() });
    setRecent(getRecentMeetings());
    setEmbedCreate(false);
    setEmbedLink('');
    setEmbedInvite(info);
    toast(t('embed.saved'), 'success');
  };

  const typeRows = (
    <Group title={t('form.type')}>
      {(['conference', 'webinar'] as MeetingType[]).map((k) => (
        <Row key={k} icon={k === 'conference' ? 'video' : 'presentation'} iconTone={k === 'conference' ? 'blue' : 'indigo'} label={t(`form.type.${k}`)} detail={t(`form.type.${k}Hint`)} onClick={() => setType(k)}>
          {type === k ? <Icon name="check" size={18} className="check-mark" /> : null}
        </Row>
      ))}
    </Group>
  );

  return (
    <Layout>
      <div className="page">
        <div className="greet">
          <div>
            <div className="greet-date">{today}</div>
            <h1 className="greet-title">{name.trim() ? t('home.greeting').replace('{name}', name.trim()) : t('home.greetingAnon')}</h1>
            <div className="greet-sub">{t('home.subtitle')}</div>
          </div>
        </div>

        <div className="tiles">
          <button type="button" className="tile" onClick={() => setSheet('join')}>
            <span className="tile-icon blue">
              <Icon name="log-in" size={24} />
            </span>
            <span className="tile-text">
              <span className="tile-title">{t('home.join')}</span>
              <span className="tile-desc">{t('home.tileJoinDesc')}</span>
            </span>
            <Icon name="chevron-right" size={16} className="tile-chev" />
          </button>
          <button type="button" className="tile" onClick={() => (mode === 'embed' ? setEmbedCreate(true) : setSheet('create'))}>
            <span className="tile-icon green">
              <Icon name="video" size={24} />
            </span>
            <span className="tile-text">
              <span className="tile-title">{t('home.create')}</span>
              <span className="tile-desc">{t('home.tileCreateDesc')}</span>
            </span>
            <Icon name="chevron-right" size={16} className="tile-chev" />
          </button>
        </div>

        <span className="status-line" title={mode === 'embed' ? t('home.statusEmbedHint') : undefined}>
          <span className={`dot ${mode === 'embed' ? 'dot-embed' : ''}`} /> {t(statusKey)}
        </span>
        {mode === 'embed' ? <p className="hint">{t('home.statusEmbedHint')}</p> : null}

        <Group title={<><Icon name="clock" size={14} /> {t('home.recent')}</>} footer={recent.length ? t('home.recentHint') : undefined}>
          {recent.length === 0 ? (
            <div className="empty">
              <Icon name="video" size={26} />
              <b>{t('home.noRecent')}</b>
              <span className="small">{t('home.recentEmptyHint')}</span>
            </div>
          ) : (
            recent.map((m) => (
              <div key={m.id} className="row row-tap" onClick={() => rejoin(m)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && rejoin(m)}>
                <Avatar name={m.title || m.displayCode} size={40} />
                <span className="row-main">
                  <span className="recent-title">{m.title || t('meeting.title')}</span>
                  <span className="row-detail">
                    <code>{m.displayCode.length > 18 ? `${m.displayCode.slice(0, 8)}…${m.displayCode.slice(-4)}` : m.displayCode}</code> · {relativeTime(m.lastJoinedAt, lang)}
                  </span>
                </span>
                {m.role === 'host' ? <Badge tone="blue" icon="crown">{t('home.hostBadge')}</Badge> : null}
                {m.type === 'webinar' ? <Badge tone="gray">{t('form.type.webinar')}</Badge> : null}
                <span className="recent-actions" onClick={(e) => e.stopPropagation()}>
                  <IconButton icon="x" label={t('home.remove')} tone="plain" size={30} onClick={() => remove(m)} />
                </span>
                <Icon name="chevron-right" size={16} className="row-chevron" />
              </div>
            ))
          )}
        </Group>
      </div>

      {/* ---- join sheet ---- */}
      <Sheet
        open={sheet === 'join'}
        onClose={() => setSheet(null)}
        title={t('home.joinTitle')}
        leading={<button className="nav-text-btn" onClick={() => setSheet(null)}>{t('action.cancel')}</button>}
        trailing={<button className="nav-text-btn bold" onClick={() => onJoin()} disabled={!parsedRef || !name.trim()}>{t('action.join')}</button>}
      >
        <form onSubmit={onJoin} className="sheet-form">
          <Group
            footer={
              parsedRef ? (
                <span style={{ color: 'var(--green)' }}>
                  ✓ {t('home.detectedId')}: <code>{parsedRef}</code>
                  {detectedType === 'webinar' ? ` · ${t('form.type.webinar')}` : ''}
                </span>
              ) : undefined
            }
          >
            <InputRow icon="user" iconTone="blue" label={t('form.yourName')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('form.yourNamePlaceholder')} autoComplete="name" maxLength={40} />
            <InputRow
              icon="hash"
              iconTone="indigo"
              label={t('meeting.meetingId')}
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder={t('form.meetingRefPlaceholder')}
              autoFocus
              autoCapitalize="none"
              spellCheck={false}
              trailing={
                <button type="button" className="mini-btn" onClick={paste}>
                  <Icon name="clipboard" size={13} /> {t('action.paste')}
                </button>
              }
            />
          </Group>
          {!detectedType ? typeRows : null}
          {mode === 'demo' ? (
            <Group>
              <Switch icon="crown" iconTone="orange" checked={asHost} onChange={setAsHost} label={t('form.joinAsHost')} />
            </Group>
          ) : null}
          {error ? (
            <p className="form-error">
              <Icon name="alert" size={16} /> {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" block iconRight="arrow-right">
            {t('action.join')}
          </Button>
        </form>
      </Sheet>

      {/* ---- create sheet ---- */}
      <Sheet
        open={sheet === 'create'}
        onClose={() => setSheet(null)}
        title={t('home.createTitle')}
        leading={<button className="nav-text-btn" onClick={() => setSheet(null)}>{t('action.cancel')}</button>}
        trailing={<button className="nav-text-btn bold" onClick={() => void onCreate()} disabled={!name.trim() || busy}>{t('action.start')}</button>}
      >
        <form onSubmit={onCreate} className="sheet-form">
          <Group>
            <InputRow icon="user" iconTone="blue" label={t('form.yourName')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('form.yourNamePlaceholder')} autoComplete="name" maxLength={40} />
            <InputRow icon="message" iconTone="green" label={t('form.meetingTitle')} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('form.meetingTitlePlaceholder')} maxLength={80} autoFocus />
          </Group>
          {typeRows}
          {mode === 'selfhosted' ? (
            <Group>
              <InputRow icon="lock" iconTone="gray" label={t('form.accessCode')} value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder={t('form.accessCodePlaceholder')} />
            </Group>
          ) : null}
          {error ? (
            <p className="form-error">
              <Icon name="alert" size={16} /> {error}
            </p>
          ) : null}
          <Button type="submit" variant="success" size="lg" block loading={busy} icon="video">
            {t('action.start')}
          </Button>
        </form>
      </Sheet>

      <Sheet open={embedCreate} onClose={() => setEmbedCreate(false)} title={t('embed.createTitle')} leading={<button className="nav-text-btn" onClick={() => setEmbedCreate(false)}>{t('action.cancel')}</button>} trailing={<button className="nav-text-btn bold" onClick={saveEmbedMeeting} disabled={!embedParsed}>{t('embed.saveInvite')}</button>}>
        <p className="hint">
          <Icon name="info" size={14} /> {t('embed.createHint')}
        </p>
        <Group title="1" footer={t('embed.step1')}>
          {(['conference', 'webinar'] as MeetingType[]).map((k) => (
            <Row key={k} icon={k === 'conference' ? 'video' : 'presentation'} iconTone={k === 'conference' ? 'blue' : 'indigo'} label={t(`form.type.${k}`)} onClick={() => setType(k)}>
              {type === k ? <Icon name="check" size={18} className="check-mark" /> : null}
            </Row>
          ))}
          <Row icon="external" iconTone="green" label={t('embed.openLobby')} chevron onClick={() => openExternal(demoLobbyUrl(type))} />
        </Group>
        <Group title="2" footer={embedParsed ? <span style={{ color: 'var(--green)' }}>✓ {t('home.detectedId')}: <code>{embedParsed}</code></span> : t('embed.step2')}>
          <InputRow icon="message" iconTone="gray" label={t('form.meetingTitle')} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('form.meetingTitlePlaceholder')} maxLength={80} />
          <InputRow
            icon="link"
            iconTone="indigo"
            label={t('embed.pasteLabel')}
            value={embedLink}
            onChange={(e) => setEmbedLink(e.target.value)}
            placeholder="https://demo.realtime.cloudflare.com/meeting?id=…"
            autoCapitalize="none"
            spellCheck={false}
            trailing={
              <button type="button" className="mini-btn" onClick={pasteEmbed}>
                <Icon name="clipboard" size={13} /> {t('action.paste')}
              </button>
            }
          />
        </Group>
        <Button block size="lg" icon="qr" disabled={!embedParsed} onClick={saveEmbedMeeting}>
          {t('embed.saveInvite')}
        </Button>
        <p className="hint">{t('embed.selfhostHint')}</p>
      </Sheet>
      {embedInvite ? <InviteDialog open onClose={() => setEmbedInvite(null)} meeting={embedInvite} source="demo" isHost /> : null}
    </Layout>
  );
}
