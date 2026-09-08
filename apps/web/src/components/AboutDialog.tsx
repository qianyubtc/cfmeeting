import { useI18n } from '../lib/i18n';
import { OFFICIAL_DEMO_URL, REPO_URL, RTK_DOCS_URL, UPSTREAM_EXAMPLES_URL } from '../lib/links';
import { appVersion, openExternal } from '../lib/platform';
import { Badge, Group, Logo, Row, Sheet } from './ui';

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onClose={onClose} title={t('about.title')} wide trailing={<button className="nav-text-btn bold" onClick={onClose}>{t('action.done')}</button>} leading={<span />}>
      <div className="about-head">
        <Logo size={56} />
        <div>
          <div className="about-name">
            CFMeeting <Badge tone="gray">{t('home.edition')}</Badge>
          </div>
          <div className="muted small">v{appVersion} · MIT · Cloudflare RealtimeKit</div>
        </div>
      </div>
      <section className="notice-card">
        <h3>{t('about.disclaimerTitle')}</h3>
        <p>{t('about.disclaimer1')}</p>
        <p>{t('about.disclaimer2')}</p>
        <p>{t('about.disclaimer3')}</p>
      </section>
      <Group title={t('about.credits')}>
        <div className="row">
          <span className="row-main">
            <span className="row-detail" style={{ whiteSpace: 'normal' }}>
              {t('about.creditsBody')}
            </span>
          </span>
        </div>
      </Group>
      <Group title={t('about.links')}>
        <Row icon="code" iconTone="gray" label={t('about.sourceCode')} chevron onClick={() => openExternal(REPO_URL)} />
        <Row icon="cloud" iconTone="orange" label={t('about.demo')} chevron onClick={() => openExternal(OFFICIAL_DEMO_URL)} />
        <Row icon="globe" iconTone="blue" label="realtimekit-web-examples" chevron onClick={() => openExternal(UPSTREAM_EXAMPLES_URL)} />
        <Row icon="book" iconTone="indigo" label={t('about.docs')} chevron onClick={() => openExternal(RTK_DOCS_URL)} />
      </Group>
    </Sheet>
  );
}
