(function () {
  const cfg = window.CFM_CONFIG || {};
  const repo = cfg.repo || '';
  const repoUrl = repo && !repo.startsWith('YOUR_') ? `https://github.com/${repo}` : '';
  const webApp = cfg.webApp || '/app/';

  // ad slots (hidden unless configured; ?ads=preview shows placeholders)
  const adPreview = new URLSearchParams(location.search).get('ads') === 'preview';
  const adSizes = { hero: '横幅 · 自适应宽度（728×90 / 970×90）', download: '336×280 或横幅', footer: '横幅 · 自适应宽度' };
  document.querySelectorAll('.ad-slot[data-ad]').forEach((slot) => {
    const key = slot.dataset.ad;
    const html = ((cfg.ads || {})[key] || '').trim();
    if (!html && !adPreview) return;
    const box = document.createElement('div');
    box.className = 'ad-box' + (html ? '' : ' ad-placeholder');
    if (html) {
      box.innerHTML = html;
      // scripts inserted via innerHTML do not run — recreate them (AdSense etc.)
      box.querySelectorAll('script').forEach((old) => {
        const s = document.createElement('script');
        [...old.attributes].forEach((a) => s.setAttribute(a.name, a.value));
        s.text = old.text;
        old.replaceWith(s);
      });
    } else {
      box.innerHTML = '<span>广告位 · ' + key + '</span><small>' + (adSizes[key] || '') + '</small>';
    }
    const tag = document.createElement('span');
    tag.className = 'ad-tag';
    tag.textContent = cfg.adLabel || '赞助';
    box.appendChild(tag);
    slot.appendChild(box);
    slot.hidden = false;
  });

  // links
  document.querySelectorAll('[data-repo-link]').forEach((a) => {
    a.href = repoUrl ? repoUrl + (a.dataset.suffix || '') : '#';
  });
  document.querySelectorAll('[data-web-link]').forEach((a) => (a.href = webApp));

  const ICONS = {
    apple: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.37 12.64c-.02-2.3 1.88-3.4 1.96-3.45-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3-.79-1.55.02-2.98.9-3.78 2.28-1.61 2.8-.41 6.93 1.16 9.2.77 1.11 1.68 2.36 2.88 2.31 1.16-.05 1.6-.75 3-.75s1.79.75 3.02.73c1.25-.02 2.04-1.13 2.8-2.25.88-1.29 1.24-2.54 1.26-2.6-.03-.01-2.42-.93-2.5-3.71zM14.1 5.9c.64-.77 1.07-1.85.95-2.92-.92.04-2.03.61-2.69 1.38-.59.68-1.11 1.78-.97 2.83 1.03.08 2.07-.52 2.71-1.29z"/></svg>',
    windows: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5.5 10.5 4.5v7H3zm8.5-1.2L21 3v8.5h-9.5zM3 12.5h7.5v7L3 18.5zm8.5 0H21V21l-9.5-1.3z"/></svg>',
    android: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.43 11.43 0 0 0-8.94 0L5.65 5.67a.62.62 0 0 0-.83-.22c-.3.16-.42.54-.26.85L6.4 9.48A10.81 10.81 0 0 0 1 18h22a10.81 10.81 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
  };
  document.querySelector('[data-dl="mac-arm64"] .dl-icon').innerHTML = ICONS.apple;
  document.querySelector('[data-dl="mac-x64"] .dl-icon').innerHTML = ICONS.apple;
  document.querySelector('[data-dl="win"] .dl-icon').innerHTML = ICONS.windows;
  document.querySelector('[data-dl="android"] .dl-icon').innerHTML = ICONS.android;
  document.querySelector('.dl[data-web-link] .dl-icon').innerHTML = ICONS.globe;

  // detect platform for the primary CTA
  const ua = navigator.userAgent;
  const isIOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const platform = isIOS ? 'ios' : /Android/i.test(ua) ? 'android' : /Windows/i.test(ua) ? 'win' : /Mac/i.test(ua) ? 'mac' : 'other';
  const cta = document.getElementById('cta-primary');
  const ctaLabel = document.getElementById('cta-label');
  if (platform === 'ios') { cta.href = webApp; ctaLabel.textContent = '打开网页版（添加到主屏幕）'; }
  else if (platform === 'android') ctaLabel.textContent = '下载 Android 版';
  else if (platform === 'win') ctaLabel.textContent = '下载 Windows 版';
  else if (platform === 'mac') ctaLabel.textContent = '下载 macOS 版';

  const fmtSize = (n) => (n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.round(n / 1e3) + ' KB');
  const line = document.getElementById('version-line');
  const all = document.getElementById('all-releases');
  const cards = {
    'mac-arm64': (a) => /mac.*arm64.*\.dmg$/i.test(a.name) || /arm64.*\.dmg$/i.test(a.name),
    'mac-x64': (a) => /mac.*x64.*\.dmg$/i.test(a.name) || /(x64|intel).*\.dmg$/i.test(a.name),
    win: (a) => /\.exe$/i.test(a.name),
    android: (a) => /\.apk$/i.test(a.name),
  };

  function markUnavailable(msg) {
    document.querySelectorAll('.dl[data-dl]').forEach((el) => { el.classList.add('unavailable'); el.href = repoUrl ? repoUrl + '/releases' : '#'; el.querySelector('.dl-meta').textContent = msg; });
    line.textContent = repoUrl ? `v${cfg.fallbackVersion || ''} · 请在 GitHub Releases 页面下载` : '尚未配置 GitHub 仓库（site/config.js）';
  }

  if (!repoUrl) { markUnavailable('待发布'); return; }
  all.innerHTML = `所有版本：<a href="${repoUrl}/releases" target="_blank" rel="noopener">${repoUrl.replace('https://', '')}/releases</a>`;

  fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no release'))))
    .then((rel) => {
      const assets = rel.assets || [];
      line.textContent = `最新版本 ${rel.tag_name} · ${new Date(rel.published_at).toLocaleDateString('zh-CN')}`;
      let primaryHref = null;
      Object.entries(cards).forEach(([key, match]) => {
        const el = document.querySelector(`.dl[data-dl="${key}"]`);
        const asset = assets.find(match);
        if (asset) {
          el.href = asset.browser_download_url;
          el.querySelector('.dl-meta').textContent = `${asset.name} · ${fmtSize(asset.size)}`;
          if ((platform === 'mac' && key === 'mac-arm64') || (platform === 'win' && key === 'win') || (platform === 'android' && key === 'android')) primaryHref = asset.browser_download_url;
        } else {
          el.classList.add('unavailable');
          el.href = rel.html_url;
          el.querySelector('.dl-meta').textContent = '本版本暂无此平台';
        }
      });
      if (primaryHref && platform !== 'ios') cta.href = primaryHref;
    })
    .catch(() => markUnavailable('暂无发布版本'));
})();
