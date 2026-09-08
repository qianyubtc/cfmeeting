import { useEffect, useState } from 'react';
import type { States } from '@cloudflare/realtimekit-react-ui';
import { Icon, type IconName } from '../Icons';

/** Ask the surrounding <rtk-ui-provider> to update UI Kit state (open sidebar, dialogs, …). */
export function emitRtkState(el: HTMLElement | null, detail: Partial<States>): void {
  (el ?? document.body).dispatchEvent(new CustomEvent('rtkStateUpdate', { detail, bubbles: true, composed: true }));
}

export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export type CtlState = 'on' | 'off' | 'muted' | 'danger' | 'active';

/** FaceTime-style circular control. */
export function Ctl({ icon, label, state = 'off', onClick, disabled, dot, hideLabel }: { icon: IconName; label: string; state?: CtlState; onClick?: () => void; disabled?: boolean; dot?: boolean; hideLabel?: boolean }) {
  return (
    <button type="button" className={`ctl ctl-${state}`} onClick={onClick} disabled={disabled} title={label} aria-label={label}>
      <span className="ctl-wrap">
        <span className="ctl-circle">
          <Icon name={icon} size={22} />
        </span>
        {dot ? <span className="ctl-dot" /> : null}
      </span>
      {!hideLabel ? <span className="ctl-label">{label}</span> : null}
    </button>
  );
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
