/**
 * UI 预览面板（仅开发模式）：在浏览器里模拟各端界面，快速打开每个页面 / 弹层 / 状态。
 * 完整模式需要本地转发服务（npm run preview 会一起启动），静态模式不需要。
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBackend, getMode, saveSession } from '../lib/backend';
import { useI18n, type Lang } from '../lib/i18n';
import { emulation, platformName } from '../lib/platform';
import { getItem, rememberMeeting, setItem } from '../lib/storage';
import { applyTheme, getTheme, type Theme } from '../lib/theme';
import { Layout } from '../components/Layout';
import { Icon } from '../components/Icons';
import { Button, useToast } from '../components/ui';

const PHONE = 'width=400,height=860,menubar=no,toolbar=no,location=no,status=no';

export function Preview() {
  const { lang, setLang } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const mode = getMode();
  const theme = getTheme();
  const name = getItem<string>('name', '') || '预览用户';

  const go = (path: string, phone = false) => {
    if (phone) window.open(`${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`, '_blank', PHONE);
    else navigate(path);
  };
  const reloadWith = (params: Record<string, string>) => {
    const url = new URL(window.location.href);
    url.pathname = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/preview`;
    url.search = '';
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    window.location.href = url.toString();
  };

  const createMeeting = async (quick: boolean) => {
    const backend = getBackend();
    if (!backend) {
      toast('当前是静态模式：完整界面需要本地转发服务（npm run preview）', 'error');
      return;
    }
    setBusy(true);
    try {
      if (!getItem<string>('name', '')) setItem('name', name);
      const result = await backend.create({ name, title: `UI 预览 · ${new Date().toLocaleTimeString()}`, type: 'conference' });
      saveSession({ ...result, name, savedAt: Date.now() });
      rememberMeeting({ id: result.meeting.id, ref: result.meeting.ref, displayCode: result.meeting.displayCode, title: result.meeting.title, type: result.meeting.type, role: 'host', hostKey: result.hostKey, source: result.source, lastJoinedAt: Date.now() });
      navigate(`/m/${encodeURIComponent(result.meeting.ref)}${quick ? '?quick=1' : ''}`);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const Card = ({ title, desc, path, action }: { title: string; desc: string; path?: string; action?: () => void }) => (
    <div className="preview-card">
      <b>{title}</b>
      <small>{desc}</small>
      <div className="btn-row">
        <Button size="sm" onClick={() => (action ? action() : path && go(path))} loading={busy && !path}>
          打开
        </Button>
        {path ? (
          <Button size="sm" variant="gray" icon="smartphone" onClick={() => go(path, true)}>
            手机窗口
          </Button>
        ) : null}
      </div>
    </div>
  );

  const full = mode !== 'embed';

  return (
    <Layout>
      <div className="page" style={{ maxWidth: 900 }}>
        <div>
          <div className="greet-date">仅开发模式可见 · npm run preview</div>
          <h1 className="greet-title">UI 预览面板</h1>
          <div className="greet-sub">
            当前：{full ? '完整模式（桌面 / 安卓的界面）' : '静态网页模式（网页 / iOS 轻应用的界面）'} · 平台模拟 {emulation ?? '关'} · 识别为 {platformName}
          </div>
        </div>

        <section className="group">
          <div className="group-title">模式（决定会前准备页与会议室是否可用）</div>
          <div className="chips">
            <button className={`chip-toggle ${full ? 'active' : ''}`} onClick={() => reloadWith({ mode: 'auto' })}>
              完整模式（桌面 / 安卓）
            </button>
            <button className={`chip-toggle ${!full ? 'active' : ''}`} onClick={() => reloadWith({ mode: 'embed' })}>
              静态网页模式（网页 / iOS）
            </button>
          </div>
          <div className="group-footer">完整模式需要本地转发服务在 8787 端口运行；这只是本机预览用，产品本身不带后端。</div>
        </section>

        <section className="group">
          <div className="group-title">平台模拟（只影响文案与按钮显隐，例如屏幕共享、安装提示）</div>
          <div className="chips">
            {(['off', 'desktop', 'android', 'ios'] as const).map((e) => (
              <button key={e} className={`chip-toggle ${(emulation ?? 'off') === e ? 'active' : ''}`} onClick={() => reloadWith({ emulate: e })}>
                {e === 'off' ? '不模拟' : e === 'desktop' ? '桌面' : e === 'android' ? '安卓' : 'iOS'}
              </button>
            ))}
          </div>
        </section>

        <section className="group">
          <div className="group-title">外观</div>
          <div className="chips">
            {(['light', 'dark'] as Theme[]).map((t) => (
              <button key={t} className={`chip-toggle ${theme === t ? 'active' : ''}`} onClick={() => { applyTheme(t); reloadWith({}); }}>
                {t === 'light' ? '浅色' : '深色'}
              </button>
            ))}
            {(['zh', 'en'] as Lang[]).map((l) => (
              <button key={l} className={`chip-toggle ${lang === l ? 'active' : ''}`} onClick={() => setLang(l)}>
                {l === 'zh' ? '中文' : 'English'}
              </button>
            ))}
          </div>
          <div className="group-footer">手机尺寸：点"手机窗口"会用 400×860 的弹窗打开；也可以用浏览器 DevTools 的设备模式（⌘⇧M）。</div>
        </section>

        <section className="group">
          <div className="group-title">
            <Icon name="grid" size={14} /> 页面与弹层
          </div>
          <div className="preview-grid">
            <Card title="首页" desc="问候、两张动作卡、最近会议" path="/" />
            <Card title="加入会议弹层" desc="名字、会议号、类型、主持人开关" path="/?sheet=join" />
            <Card title="发起会议弹层" desc={full ? '名字、主题、类型' : '静态模式：两步创建（官方页面 + 粘贴链接）'} path="/?sheet=create" />
            <Card title="设置" desc="语言、外观、服务器地址、安装" path="/?open=settings" />
            <Card title="关于与声明" desc="二创声明、致谢、链接" path="/?open=about" />
            <Card title="会前准备页" desc={full ? '新建一场测试会议 → 预览、设备选择' : '需要完整模式'} action={() => void createMeeting(false)} />
            <Card title="会议室" desc={full ? '新建并直接进入会议室（可点邀请、更多、离开）' : '需要完整模式'} action={() => void createMeeting(true)} />
            <Card title="会前确认页（直链无名字时）" desc="通过链接进入且未填过名字时的页面" path="/m/00000000-0000-4000-8000-000000000000?preview=prejoin" />
            <Card title="会议结束页" desc="离开会议后的页面" path="/m/00000000-0000-4000-8000-000000000000?preview=ended" />
            <Card title="错误页" desc="会议不存在 / 加入失败" path="/m/00000000-0000-4000-8000-000000000000?preview=error" />
            <Card title="静态模式：内嵌加入页" desc="网页 / iOS 加入会议时的页面（内嵌官方页面）" path="/m/00000000-0000-4000-8000-000000000000?mode=embed" />
          </div>
        </section>
      </div>
    </Layout>
  );
}
