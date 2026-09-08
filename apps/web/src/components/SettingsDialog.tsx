import { useEffect, useState } from 'react';
import { useI18n, type Lang } from '../lib/i18n';
import { getMode, getServerUrl, setServerUrl } from '../lib/backend';
import { canInstall, onInstallAvailable, promptInstall } from '../lib/device';
import { isAndroid, isCapacitor, isElectron, isIOS, isStandalone, platformName } from '../lib/platform';
import { applyTheme, getTheme, type Theme } from '../lib/theme';
import { Group, InputRow, Row, Segmented, Sheet, useToast } from './ui';

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang, setLang } = useI18n();
  const toast = useToast();
  const [theme, setTheme] = useState<Theme>(getTheme);
  const [serverUrl, setUrl] = useState(getServerUrl);
  const [installable, setInstallable] = useState(canInstall);
  const mode = getMode();

  useEffect(() => onInstallAvailable(() => setInstallable(canInstall())), []);
  useEffect(() => {
    if (open) setUrl(getServerUrl());
  }, [open]);

  const save = () => {
    const changed = serverUrl.trim().replace(/\/+$/, '') !== getServerUrl();
    setServerUrl(serverUrl);
    onClose();
    if (changed) window.location.reload();
  };

  const showWebInstall = !isElectron && !isCapacitor && !isStandalone;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('settings.title')}
      leading={<button className="nav-text-btn" onClick={onClose}>{t('action.cancel')}</button>}
      trailing={<button className="nav-text-btn bold" onClick={save}>{t('action.done')}</button>}
    >
      <Group title={t('settings.general')}>
        <div className="row">
          <span className="row-label row-label-fixed">{t('settings.language')}</span>
          <span className="row-select-wrap">
            <Segmented<Lang>
              value={lang}
              onChange={setLang}
              options={[
                { value: 'zh', label: '简体中文' },
                { value: 'en', label: 'English' },
              ]}
              className="seg-inline"
            />
          </span>
        </div>
        <div className="row">
          <span className="row-label row-label-fixed">{t('settings.theme')}</span>
          <span className="row-select-wrap">
            <Segmented<Theme>
              value={theme}
              onChange={(next) => {
                setTheme(next);
                applyTheme(next);
              }}
              options={[
                { value: 'light', label: t('settings.theme.light'), icon: 'sun' },
                { value: 'dark', label: t('settings.theme.dark'), icon: 'moon' },
              ]}
              className="seg-inline"
            />
          </span>
        </div>
      </Group>

      <Group title={t('settings.connection')} footer={t('settings.serverUrlHint')}>
        <InputRow icon="server" iconTone="gray" value={serverUrl} onChange={(e) => setUrl(e.target.value)} placeholder={t('settings.serverUrlPlaceholder')} inputMode="url" autoCapitalize="none" spellCheck={false} />
        <Row label={t('settings.mode')} value={<><span className={`dot ${mode === 'embed' ? 'dot-embed' : ''}`} />{t(`settings.mode.${mode}`)}</>} />
        <Row label={t('settings.platform')} value={platformName} />
        <Row label={t('settings.version')} value={__APP_VERSION__} />
      </Group>

      {showWebInstall && (installable || isIOS || isAndroid) ? (
        <Group title={t('action.install')} footer={isIOS ? t('settings.installIos') : !installable && isAndroid ? t('settings.installAndroid') : undefined}>
          {installable ? (
            <Row
              icon="download"
              iconTone="blue"
              label={t('action.install')}
              chevron
              onClick={async () => {
                const ok = await promptInstall();
                if (ok) toast(t('action.installed'), 'success');
                setInstallable(canInstall());
              }}
            />
          ) : (
            <Row icon={isIOS ? 'share' : 'smartphone'} iconTone="gray" label={t('action.install')} value={isIOS ? 'Safari' : 'Chrome'} />
          )}
        </Group>
      ) : null}
    </Sheet>
  );
}
