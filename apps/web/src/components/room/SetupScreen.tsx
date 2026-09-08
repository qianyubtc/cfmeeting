import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealtimeKitMeeting, useRealtimeKitSelector } from '@cloudflare/realtimekit-react';
import { RtkAudioVisualizer, RtkAvatar, RtkNameTag, RtkParticipantTile } from '@cloudflare/realtimekit-react-ui';
import type { MeetingInfo } from '../../lib/backend';
import { useI18n } from '../../lib/i18n';
import { isElectron, supportsScreenShare } from '../../lib/platform';
import { Icon } from '../Icons';
import { Ambient } from '../Layout';
import { Badge, Button, Group, IconButton, InputRow, Logo, Row, SelectRow, useToast } from '../ui';
import { Ctl } from './shared';

interface Devices {
  audio: MediaDeviceInfo[];
  video: MediaDeviceInfo[];
  speaker: MediaDeviceInfo[];
}

export function SetupScreen({ meetingInfo, isHost, onBack, autoStart }: { meetingInfo: MeetingInfo; isHost: boolean; onBack: () => void; autoStart?: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const { meeting } = useRealtimeKitMeeting();
  const audioEnabled = useRealtimeKitSelector((m) => m.self.audioEnabled);
  const videoEnabled = useRealtimeKitSelector((m) => m.self.videoEnabled);
  const title = useRealtimeKitSelector((m) => m.meta.meetingTitle) || meetingInfo.title;

  const canEdit = meeting.self.permissions.canEditDisplayName ?? true;
  const canAudio = meeting.self.permissions.canProduceAudio === 'ALLOWED';
  const canVideo = meeting.self.permissions.canProduceVideo === 'ALLOWED';

  const [name, setName] = useState(() => meeting.self.name?.trim() || '');
  const [devices, setDevices] = useState<Devices>({ audio: [], video: [], speaker: [] });
  const [current, setCurrent] = useState<{ audio?: string; video?: string; speaker?: string }>({});
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const permissionMessage = useCallback(
    (kind: string, message: string): string | null => {
      if (message === 'ACCEPTED' || message === 'NOT_REQUESTED') return null;
      if (message === 'COULD_NOT_START') return t('perm.couldNotStart');
      const base = kind === 'video' ? t('perm.denied.video') : kind === 'screenshare' ? t('perm.denied.screenshare') : t('perm.denied.audio');
      return message === 'SYSTEM_DENIED' && (isElectron ? window.desktop?.platform === 'darwin' : /Mac/.test(navigator.platform)) ? `${base}。${t('perm.sysDenied.mac')}` : base;
    },
    [t],
  );

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const [audio, video, speaker] = await Promise.all([meeting.self.getAudioDevices(), meeting.self.getVideoDevices(), meeting.self.getSpeakerDevices()]);
        if (!alive) return;
        setDevices({ audio, video, speaker });
        const cur = meeting.self.getCurrentDevices();
        setCurrent({ audio: cur.audio?.deviceId, video: cur.video?.deviceId, speaker: cur.speaker?.deviceId });
      } catch {
        /* devices unavailable until permission is granted */
      }
    };
    void refresh();
    const onDevices = () => void refresh();
    const onPermission = (payload: { kind?: string; message?: string }) => {
      const msg = permissionMessage(payload.kind ?? 'audio', payload.message ?? '');
      if (msg) toast(msg, 'error');
      void refresh();
    };
    meeting.self.on('deviceListUpdate', onDevices);
    meeting.self.on('mediaPermissionUpdate', onPermission);
    return () => {
      alive = false;
      meeting.self.off('deviceListUpdate', onDevices);
      meeting.self.off('mediaPermissionUpdate', onPermission);
    };
  }, [meeting, permissionMessage, toast]);

  const setDevice = async (kind: keyof Devices, deviceId: string) => {
    const device = devices[kind].find((d) => d.deviceId === deviceId);
    if (!device) return;
    setCurrent((c) => ({ ...c, [kind]: deviceId }));
    try {
      await meeting.self.setDevice(device);
    } catch (err) {
      toast((err as Error).message || t('error.generic'), 'error');
    }
  };

  const toggleMic = async () => {
    try {
      if (audioEnabled) await meeting.self.disableAudio();
      else await meeting.self.enableAudio();
    } catch (err) {
      toast(permissionMessage('audio', 'DENIED') ?? (err as Error).message, 'error');
    }
  };
  const toggleCam = async () => {
    try {
      if (videoEnabled) await meeting.self.disableVideo();
      else await meeting.self.enableVideo();
    } catch (err) {
      toast(permissionMessage('video', 'DENIED') ?? (err as Error).message, 'error');
    }
  };

  const join = async () => {
    if (canEdit && !name.trim()) return setJoinError(t('error.nameRequired'));
    setJoinError(null);
    setJoining(true);
    try {
      if (canEdit && name.trim() !== meeting.self.name) meeting.self.setName(name.trim());
      await meeting.join();
    } catch (err) {
      setJoinError((err as Error).message || t('join.default_error' as never) || t('meeting.error'));
    } finally {
      setJoining(false);
    }
  };

  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStart && !autoStarted.current && (name.trim() || !canEdit)) {
      autoStarted.current = true;
      void join();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const label = (d: MediaDeviceInfo, fallback: string, i: number) => d.label || `${fallback} ${i + 1}`;

  return (
    <div className="app">
      <Ambient />
      <header className="topbar">
        <div className="brand">
          <IconButton icon="chevron-left" label={t('action.back')} onClick={onBack} size={32} />
          <Logo size={26} />
          <span className="brand-name">{t('setup.title')}</span>
        </div>
      </header>
      <main className="main">
        <div className="setup">
          <div className="setup-preview">
            <RtkParticipantTile participant={meeting.self} isPreview size="md">
              <RtkAvatar participant={meeting.self} size="md" />
              <RtkNameTag participant={meeting.self} size="sm">
                <RtkAudioVisualizer participant={meeting.self} size="sm" slot="start" />
              </RtkNameTag>
            </RtkParticipantTile>
            <div className="setup-overlay">
              {canAudio ? <Ctl icon={audioEnabled ? 'mic' : 'mic-off'} label={t('ctrl.mic')} state={audioEnabled ? 'on' : 'muted'} onClick={toggleMic} /> : null}
              {canVideo ? <Ctl icon={videoEnabled ? 'video' : 'video-off'} label={t('ctrl.camera')} state={videoEnabled ? 'on' : 'muted'} onClick={toggleCam} /> : null}
            </div>
          </div>

          <div className="setup-side">
            <div>
              <h1 className="setup-title">{title || t('meeting.title')}</h1>
              <div className="setup-meta" style={{ marginTop: 8 }}>
                <Badge tone="gray" icon={meetingInfo.type === 'webinar' ? 'presentation' : 'video'}>
                  {t(`form.type.${meetingInfo.type}`)}
                </Badge>
                <Badge tone={isHost ? 'blue' : 'gray'} icon={isHost ? 'crown' : 'user'}>
                  {isHost ? t('meeting.asHost') : t('meeting.asGuest')}
                </Badge>
                <Badge tone="gray" icon="hash">
                  {meetingInfo.displayCode.length > 14 ? `${meetingInfo.displayCode.slice(0, 8)}…` : meetingInfo.displayCode}
                </Badge>
              </div>
            </div>

            <Group>
              {canEdit ? (
                <InputRow icon="user" iconTone="blue" label={t('form.yourName')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('form.yourNamePlaceholder')} maxLength={40} autoFocus />
              ) : (
                <Row icon="user" iconTone="blue" label={t('setup.nameLocked')} value={name} />
              )}
            </Group>

            <Group title={t('setup.devices')}>
              {canAudio ? (
                <SelectRow icon="mic" iconTone="orange" label={t('setup.mic')} value={current.audio ?? ''} onChange={(v) => void setDevice('audio', v)} options={devices.audio.map((d, i) => ({ value: d.deviceId, label: label(d, t('setup.mic'), i) }))} placeholder={t('setup.noDevice')} />
              ) : null}
              {canVideo ? (
                <SelectRow icon="video" iconTone="green" label={t('setup.camera')} value={current.video ?? ''} onChange={(v) => void setDevice('video', v)} options={devices.video.map((d, i) => ({ value: d.deviceId, label: label(d, t('setup.camera'), i) }))} placeholder={t('setup.noDevice')} />
              ) : null}
              {devices.speaker.length > 0 ? (
                <SelectRow icon="volume" iconTone="indigo" label={t('setup.speaker')} value={current.speaker ?? ''} onChange={(v) => void setDevice('speaker', v)} options={devices.speaker.map((d, i) => ({ value: d.deviceId, label: label(d, t('setup.speaker'), i) }))} />
              ) : null}
            </Group>

            {joinError ? (
              <p className="form-error">
                <Icon name="alert" size={16} /> {joinError}
              </p>
            ) : null}
            <Button size="lg" block loading={joining} onClick={join} iconRight="arrow-right">
              {t('setup.join')}
            </Button>
            <p className="hint">
              <Icon name="shield" size={14} /> {t('setup.permHint')}
              {!supportsScreenShare ? ` ${t('meeting.screenShareUnsupported')}` : ''}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
