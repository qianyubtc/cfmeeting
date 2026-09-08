import { useEffect, useRef, useState } from 'react';
import { useRealtimeKitMeeting, useRealtimeKitSelector } from '@cloudflare/realtimekit-react';
import { RtkGrid, RtkNotifications, RtkParticipantsAudio, RtkSidebar, RtkStage, type States } from '@cloudflare/realtimekit-react-ui';
import type { MeetingInfo } from '../../lib/backend';
import { useI18n } from '../../lib/i18n';
import { supportsScreenShare } from '../../lib/platform';
import { Icon } from '../Icons';
import { useToast } from '../ui';
import { Ctl, emitRtkState, formatElapsed, useMedia } from './shared';

type Section = 'chat' | 'participants' | 'polls' | 'plugins';

export function Room({ states, meetingInfo, onInvite }: { states: States; meetingInfo: MeetingInfo; onInvite: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const { meeting } = useRealtimeKitMeeting();
  const rootRef = useRef<HTMLDivElement>(null);
  const isMobile = useMedia('(max-width: 600px)');

  const audioEnabled = useRealtimeKitSelector((m) => m.self.audioEnabled);
  const videoEnabled = useRealtimeKitSelector((m) => m.self.videoEnabled);
  const screenShareEnabled = useRealtimeKitSelector((m) => m.self.screenShareEnabled);
  const joinedCount = useRealtimeKitSelector((m) => m.participants.joined.size);
  const title = useRealtimeKitSelector((m) => m.meta.meetingTitle) || meetingInfo.title;
  const viewType = useRealtimeKitSelector((m) => m.meta.viewType);
  const stageStatus = useRealtimeKitSelector((m) => m.stage.status);
  const recordingState = useRealtimeKitSelector((m) => m.recording.recordingState);
  const chatCount = useRealtimeKitSelector((m) => m.chat.messages.length);
  const canAudio = useRealtimeKitSelector((m) => m.self.permissions.canProduceAudio) === 'ALLOWED';
  const canVideo = useRealtimeKitSelector((m) => m.self.permissions.canProduceVideo) === 'ALLOWED';
  const canShare = useRealtimeKitSelector((m) => m.self.permissions.canProduceScreenshare) === 'ALLOWED' && supportsScreenShare;
  const perms = meeting.self.permissions as unknown as Record<string, unknown>;
  const canRecord = perms.canRecord === true;
  const canMuteAll = perms.canDisableParticipantAudio === true;
  const canBreakout = Boolean((perms.connectedMeetings as { canAlterConnectedMeetings?: boolean } | undefined)?.canAlterConnectedMeetings);
  const isWebinarViewer = viewType === 'WEBINAR' && stageStatus !== 'ON_STAGE';

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const [seenChat, setSeenChat] = useState(chatCount);
  const chatOpen = Boolean(states.activeSidebar) && states.sidebar === 'chat';
  useEffect(() => {
    if (chatOpen) setSeenChat(chatCount);
  }, [chatOpen, chatCount]);
  const unread = !chatOpen && chatCount > seenChat;

  const [more, setMore] = useState(false);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const emit = (detail: Partial<States>) => emitRtkState(rootRef.current, detail);
  const toggleSidebar = (section: Section) => {
    const open = Boolean(states.activeSidebar) && states.sidebar === section;
    emit({ activeSidebar: !open, sidebar: section });
  };
  const fail = (err: unknown) => toast((err as Error)?.message || t('error.generic'), 'error');

  const toggleMic = () => (audioEnabled ? meeting.self.disableAudio() : meeting.self.enableAudio()).catch(fail);
  const toggleCam = () => (videoEnabled ? meeting.self.disableVideo() : meeting.self.enableVideo()).catch(fail);
  const toggleShare = () => (screenShareEnabled ? meeting.self.disableScreenShare() : meeting.self.enableScreenShare()).catch(fail);
  const toggleRecording = () => (recordingState === 'RECORDING' ? meeting.recording.stop() : meeting.recording.start()).catch(fail);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(fail);
  };
  const stageAction = () => {
    const p =
      stageStatus === 'ON_STAGE'
        ? meeting.stage.leave()
        : stageStatus === 'REQUESTED_TO_JOIN_STAGE'
          ? meeting.stage.cancelRequestAccess()
          : stageStatus === 'ACCEPTED_TO_JOIN_STAGE'
            ? meeting.stage.join()
            : meeting.stage.requestAccess();
    void Promise.resolve(p).catch(fail);
  };
  const stageLabel =
    stageStatus === 'ON_STAGE' ? t('ctrl.stage.leave') : stageStatus === 'REQUESTED_TO_JOIN_STAGE' ? t('ctrl.stage.cancel') : stageStatus === 'ACCEPTED_TO_JOIN_STAGE' ? t('ctrl.stage.join') : t('ctrl.stage.request');

  const sidebarOpen = Boolean(states.activeSidebar);

  return (
    <div className="room" ref={rootRef}>
      <div className="room-stage">
        <RtkStage>
          <RtkGrid />
          <RtkNotifications />
          {sidebarOpen ? <RtkSidebar view={isMobile ? 'full-screen' : 'sidebar'} /> : null}
        </RtkStage>
      </div>
      <RtkParticipantsAudio />

      <div className="room-top">
        <span className="chip chip-title">
          <Icon name={viewType === 'WEBINAR' ? 'presentation' : 'video'} size={15} />
          <span>{title || t('meeting.title')}</span>
        </span>
        {!isMobile ? (
          <span className="chip">
            <Icon name="clock" size={14} /> {formatElapsed(elapsed)}
          </span>
        ) : null}
        <span className="chip">
          <Icon name="users" size={14} /> {t('room.people').replace('{n}', String(joinedCount + 1))}
        </span>
        {recordingState === 'RECORDING' ? (
          <span className="chip chip-rec">
            <span className="rec-dot" /> {t('room.recording')}
          </span>
        ) : null}
        <span className="room-spacer" />
        <button type="button" className="chip chip-btn" onClick={onInvite}>
          <Icon name="user-plus" size={15} /> {!isMobile ? t('ctrl.invite') : null}
        </button>
      </div>

      {screenShareEnabled ? (
        <div className="room-banner">
          <Icon name="monitor" size={15} /> {t('room.sharing')}
          <button type="button" onClick={toggleShare}>
            {t('ctrl.stopShare')}
          </button>
        </div>
      ) : null}

      {isWebinarViewer && stageStatus !== 'OFF_STAGE' ? (
        <span className="chip stage-note">
          <Icon name="hand" size={14} /> {stageStatus === 'ACCEPTED_TO_JOIN_STAGE' ? t('room.stageAccepted') : t('room.stageRequested')}
        </span>
      ) : null}

      {more ? (
        <>
          <div className="sheet-overlay" style={{ background: 'transparent', backdropFilter: 'none' }} onMouseDown={() => setMore(false)} />
          <div className="more-menu" role="menu">
            {isMobile ? (
              <button className="more-item" onClick={() => { setMore(false); toggleSidebar('participants'); }}>
                <Icon name="users" size={18} /> {t('ctrl.participants')}
              </button>
            ) : null}
            {isMobile && canShare ? (
              <button className="more-item" onClick={() => { setMore(false); toggleShare(); }}>
                <Icon name="monitor" size={18} /> {screenShareEnabled ? t('ctrl.stopShare') : t('ctrl.share')}
              </button>
            ) : null}
            <button className="more-item" onClick={() => { setMore(false); emit({ activeSettings: true }); }}>
              <Icon name="settings" size={18} /> {t('ctrl.settings')}
            </button>
            <button className="more-item" onClick={() => { setMore(false); toggleSidebar('polls'); }}>
              <Icon name="bar-chart" size={18} /> {t('ctrl.polls')}
            </button>
            <button className="more-item" onClick={() => { setMore(false); toggleSidebar('plugins'); }}>
              <Icon name="grid" size={18} /> {t('ctrl.plugins')}
            </button>
            {!isMobile ? (
              <button className="more-item" onClick={() => { setMore(false); toggleFullscreen(); }}>
                <Icon name={fullscreen ? 'minimize' : 'maximize'} size={18} /> {fullscreen ? t('ctrl.exitFullscreen') : t('ctrl.fullscreen')}
              </button>
            ) : null}
            {canMuteAll || canRecord || canBreakout ? <div className="more-sep" /> : null}
            {canMuteAll ? (
              <button className="more-item" onClick={() => { setMore(false); emit({ activeMuteAllConfirmation: true }); }}>
                <Icon name="mic-off" size={18} /> {t('ctrl.muteAll')}
              </button>
            ) : null}
            {canBreakout ? (
              <button className="more-item" onClick={() => { setMore(false); emit({ activeBreakoutRoomsManager: { active: true, mode: 'create' } }); }}>
                <Icon name="layers" size={18} /> {t('ctrl.breakout')}
              </button>
            ) : null}
            {canRecord ? (
              <button className={`more-item ${recordingState === 'RECORDING' ? 'danger' : ''}`} onClick={() => { setMore(false); toggleRecording(); }}>
                <Icon name="record" size={18} /> {recordingState === 'RECORDING' ? t('ctrl.stopRecord') : t('ctrl.record')}
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      <div className="room-controls">
        {canAudio ? <Ctl icon={audioEnabled ? 'mic' : 'mic-off'} label={t('ctrl.mic')} state={audioEnabled ? 'on' : 'muted'} onClick={toggleMic} hideLabel={isMobile} /> : null}
        {canVideo ? <Ctl icon={videoEnabled ? 'video' : 'video-off'} label={t('ctrl.camera')} state={videoEnabled ? 'on' : 'muted'} onClick={toggleCam} hideLabel={isMobile} /> : null}
        {isWebinarViewer || (viewType === 'WEBINAR' && stageStatus === 'ON_STAGE' && !canAudio && !canVideo) ? (
          <Ctl icon="hand" label={stageLabel} state={stageStatus === 'ON_STAGE' || stageStatus === 'REQUESTED_TO_JOIN_STAGE' ? 'active' : 'off'} onClick={stageAction} hideLabel={isMobile} />
        ) : null}
        {canShare && !isMobile ? <Ctl icon="monitor" label={screenShareEnabled ? t('ctrl.stopShare') : t('ctrl.share')} state={screenShareEnabled ? 'active' : 'off'} onClick={toggleShare} /> : null}
        <Ctl icon="message" label={t('ctrl.chat')} state={chatOpen ? 'active' : 'off'} onClick={() => toggleSidebar('chat')} dot={unread} hideLabel={isMobile} />
        {!isMobile ? <Ctl icon="users" label={t('ctrl.participants')} state={sidebarOpen && states.sidebar === 'participants' ? 'active' : 'off'} onClick={() => toggleSidebar('participants')} /> : null}
        <Ctl icon="more-h" label={t('ctrl.more')} state={more ? 'active' : 'off'} onClick={() => setMore((v) => !v)} hideLabel={isMobile} />
        <Ctl icon="phone-off" label={t('ctrl.leave')} state="danger" onClick={() => emit({ activeLeaveConfirmation: true })} hideLabel={isMobile} />
      </div>
    </div>
  );
}
