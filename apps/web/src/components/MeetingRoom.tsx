import { useEffect, useMemo, useRef, useState } from 'react';
import { RealtimeKitProvider, useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import { RtkDialogManager, RtkUiProvider, defaultLanguage, getInitialStates, provideRtkDesignSystem, useLanguage, type States } from '@cloudflare/realtimekit-react-ui';
import type { MeetingInfo } from '../lib/backend';
import type { Lang } from '../lib/i18n';
import { useWakeLock } from '../lib/device';
import { rtkLangZh } from '../lib/rtk-lang-zh';
import { Spinner } from './ui';
import { Room } from './room/Room';
import { SetupScreen } from './room/SetupScreen';
import { WaitingScreen } from './room/WaitingScreen';

export type LeaveState = 'left' | 'ended' | 'kicked' | 'rejected' | 'disconnected' | 'failed' | 'unauthorized' | string;

interface Props {
  token: string;
  lang: Lang;
  meetingInfo: MeetingInfo;
  isHost: boolean;
  connectingLabel: string;
  onInvite: () => void;
  onBack: () => void;
  onLeft: (state: LeaveState) => void;
  onError: (error: Error) => void;
  /** Skip the setup screen confirmation and join immediately. */
  autoStart?: boolean;
}

/** RealtimeKit UI Kit components (grid, sidebar, dialogs…) follow these tokens: an iOS-dark look with system blue. */
function applyDesignTokens(): void {
  provideRtkDesignSystem(document.documentElement, {
    theme: 'darkest',
    borderRadius: 'extra-rounded',
    borderWidth: 'thin',
    spacingBase: 4,
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", Roboto, sans-serif',
    colors: {
      brand: { 300: '#5eaaff', 400: '#3396ff', 500: '#0a84ff', 600: '#0a6fd6', 700: '#0a5bb0' },
      background: { 1000: '#000000', 900: '#0b0b0f', 800: '#151519', 700: '#1f1f24', 600: '#2a2a30' },
      text: '#f2f2f7',
      'text-on-brand': '#ffffff',
      'video-bg': '#151519',
      danger: '#ff453a',
      success: '#30d158',
      warning: '#ff9f0a',
    },
  });
}

/**
 * The meeting experience, composed from RealtimeKit UI Kit building blocks
 * (the same SDK the official demo uses) with our own setup screen, header and control bar.
 */
export function MeetingRoom({ token, lang, meetingInfo, isHost, connectingLabel, onInvite, onBack, onLeft, onError, autoStart }: Props) {
  const [meeting, initMeeting] = useRealtimeKitClient();
  const [states, setStates] = useState<States>(() => getInitialStates());
  const started = useRef<string | null>(null);

  const t = useMemo(() => useLanguage(lang === 'zh' ? { ...defaultLanguage, ...rtkLangZh } : defaultLanguage), [lang]);

  useWakeLock(states.meeting === 'joined');

  useEffect(() => {
    applyDesignTokens();
  }, []);

  useEffect(() => {
    if (started.current === token) return;
    started.current = token;
    initMeeting({
      authToken: token,
      defaults: { audio: false, video: false },
      modules: { devTools: { logs: false } },
    }).catch((err: unknown) => onError(err instanceof Error ? err : new Error(String(err))));
  }, [token, initMeeting, onError]);

  useEffect(() => {
    if (!meeting) return;
    const handler = (payload: { state?: string }) => onLeft(payload?.state ?? 'left');
    meeting.self.on('roomLeft', handler);
    return () => {
      meeting.self.off('roomLeft', handler);
    };
  }, [meeting, onLeft]);

  if (!meeting) {
    return (
      <div className="room">
        <div className="room-loading">
          <Spinner label={connectingLabel} size="lg" light />
        </div>
      </div>
    );
  }

  return (
    <RealtimeKitProvider value={meeting}>
      <RtkUiProvider meeting={meeting} showSetupScreen t={t} onRtkStatesUpdate={(e) => setStates(e.detail)} style={{ display: 'block', width: '100%', height: '100%' }}>
        {states.meeting === 'setup' ? (
          <SetupScreen meetingInfo={meetingInfo} isHost={isHost} onBack={onBack} autoStart={autoStart} />
        ) : states.meeting === 'waiting' ? (
          <WaitingScreen />
        ) : states.meeting === 'joined' ? (
          <Room states={states} meetingInfo={meetingInfo} onInvite={onInvite} />
        ) : states.meeting === 'ended' ? null : (
          <div className="room">
            <div className="room-loading">
              <Spinner label={connectingLabel} size="lg" light />
            </div>
          </div>
        )}
        <RtkDialogManager />
      </RtkUiProvider>
    </RealtimeKitProvider>
  );
}
