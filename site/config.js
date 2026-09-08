// 下载页配置：建好 GitHub 仓库后改这里即可。
window.CFM_CONFIG = {
  // GitHub 仓库（owner/repo），用于拉取 Releases 与页面上的 GitHub 链接
  repo: 'qianyubtc/cfmeeting',
  // 网页版地址：同一个 Pages 项目下的 /app/（由 npm run build:site 生成）；也可以填 GitHub Pages 地址
  webApp: '/app/',
  // 版本号兜底（拉不到 Releases 时显示）
  fallbackVersion: '0.1.0',
  // 广告位：填 HTML 片段（AdSense 代码、<a><img></a> 等），留空则整块隐藏。
  // 本地预览占位效果：在地址后加 ?ads=preview
  ads: {
    hero: '',      // Hero 与下载区之间的横幅（自适应宽度，建议 728×90 / 970×90）
    download: '',  // 下载区下方（自适应，建议 336×280 或横幅）
    footer: '',    // 页脚上方横幅
  },
  adLabel: '赞助',
};
