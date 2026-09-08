import { useRealtimeKitMeeting } from '@cloudflare/realtimekit-react';
import { useI18n } from '../../lib/i18n';
import { Icon } from '../Icons';
import { Ambient } from '../Layout';
import { Button, Spinner } from '../ui';

export function WaitingScreen() {
  const { t } = useI18n();
  const { meeting } = useRealtimeKitMeeting();
  return (
    <div className="waiting">
      <Ambient />
      <div className="stage-center" style={{ position: 'relative', zIndex: 1, maxWidth: 420 }}>
        <span className="stage-icon">
          <Icon name="clock" size={28} />
        </span>
        <h1>{t('waiting.title')}</h1>
        <p className="muted">{t('waiting.body')}</p>
        <Spinner />
        <div className="stage-actions">
          <Button variant="gray" icon="log-out" onClick={() => void meeting.leave()}>
            {t('action.leave')}
          </Button>
        </div>
      </div>
    </div>
  );
}
