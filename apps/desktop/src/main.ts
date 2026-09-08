/**
 * CFMeeting desktop shell (Electron).
 *
 *  - loads the packaged web app (renderer/) or the Vite dev server (--dev)
 *  - grants camera / microphone / screen-capture permissions
 *  - screen/window picker for getDisplayMedia (system picker on macOS 15+)
 *  - performs HTTP requests for the renderer (the public Cloudflare demo API has no CORS headers)
 *  - cfmeeting://join/<id> deep links, single instance, remembered window bounds
 */
import { app, BrowserWindow, desktopCapturer, ipcMain, Menu, nativeTheme, net, session, shell, systemPreferences } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const PROTOCOL = 'cfmeeting';
const isDev = process.argv.includes('--dev');
const DEV_URL = process.env.CFMEETING_DEV_URL || 'http://localhost:5173';

// smoke-test flags: --route=/m/<id>?name=X&autojoin=1  --screenshot=<png>  --screenshot-delay=<ms>  --size=WxH
const argValue = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const screenshotPath = argValue('screenshot');
const startRoute = argValue('route');
const screenshotDelayMs = Number(argValue('screenshot-delay') || 2500);
const sizeArg = argValue('size');
// --url=<http(s) url>: load an arbitrary page (used to screenshot the marketing site locally)
const urlArg = argValue('url');

let mainWindow: BrowserWindow | null = null;
let pendingRoute: string | null = startRoute ?? null;

const ALLOWED_PERMISSIONS = new Set(['media', 'display-capture', 'mediaKeySystem', 'fullscreen', 'notifications', 'clipboard-read', 'clipboard-sanitized-write', 'pointerLock']);

/* ---------- deep links ---------- */

function routeFromDeepLink(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== `${PROTOCOL}:`) return null;
    // cfmeeting://join/<ref>?t=webinar   (host = "join", pathname = "/<ref>")
    const ref = decodeURIComponent((u.host === 'join' ? u.pathname : `${u.host}${u.pathname}`).replace(/^\/+/, '').split('/')[0] || '');
    if (!ref) return null;
    const qs = u.searchParams.toString();
    return `/m/${encodeURIComponent(ref)}${qs ? `?${qs}` : ''}`;
  } catch {
    return null;
  }
}

function deliverRoute(route: string): void {
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isLoading()) {
    mainWindow.webContents.send('desktop:navigate', route);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    pendingRoute = route;
  }
}

function handleArgvDeepLink(argv: string[]): void {
  const link = argv.find((a) => a.startsWith(`${PROTOCOL}://`));
  const route = link ? routeFromDeepLink(link) : null;
  if (route) deliverRoute(route);
}

/* ---------- window state ---------- */

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized?: boolean;
}

const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState(): WindowState {
  try {
    if (existsSync(stateFile())) return { width: 1200, height: 800, ...(JSON.parse(readFileSync(stateFile(), 'utf8')) as Partial<WindowState>) };
  } catch {
    /* ignore */
  }
  return { width: 1200, height: 800 };
}

function saveWindowState(win: BrowserWindow): void {
  try {
    const bounds = win.getNormalBounds();
    mkdirSync(app.getPath('userData'), { recursive: true });
    writeFileSync(stateFile(), JSON.stringify({ ...bounds, maximized: win.isMaximized() }));
  } catch {
    /* ignore */
  }
}

/* ---------- main window ---------- */

function createMainWindow(): void {
  const state = loadWindowState();
  const [w, h] = sizeArg ? sizeArg.split('x').map(Number) : [state.width, state.height];
  mainWindow = new BrowserWindow({
    width: w || 1200,
    height: h || 800,
    x: sizeArg ? undefined : state.x,
    y: sizeArg ? undefined : state.y,
    minWidth: 380,
    minHeight: 560,
    title: 'CFMeeting',
    backgroundColor: process.platform === 'darwin' ? '#00000000' : nativeTheme.shouldUseDarkColors ? '#0b0b0f' : '#eef1f6',
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 16, y: 18 } : undefined,
    // macOS: real frosted-glass window background behind the translucent UI
    vibrancy: process.platform === 'darwin' ? 'under-window' : undefined,
    visualEffectState: process.platform === 'darwin' ? 'active' : undefined,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  if (state.maximized && !sizeArg) mainWindow.maximize();
  mainWindow.once('ready-to-show', () => mainWindow?.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  // keep the SPA inside the window; external links go to the system browser
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow?.webContents.getURL() ?? '';
    const sameApp = url.startsWith('file://') || (isDev && url.startsWith(DEV_URL));
    if (!sameApp && url !== current) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingRoute) {
      mainWindow?.webContents.send('desktop:navigate', pendingRoute);
      pendingRoute = null;
    }
  });

  if (screenshotPath) {
    mainWindow.webContents.on('console-message', (event) => {
      if (event.level === 'warning' || event.level === 'error') console.log(`[renderer:${event.level}] ${event.message}`);
    });
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const image = await mainWindow!.webContents.capturePage();
          writeFileSync(screenshotPath, image.toPNG());
          console.log('screenshot written to', screenshotPath);
        } catch (err) {
          console.error('screenshot failed', err);
        }
        app.quit();
      }, screenshotDelayMs);
    });
  }

  if (urlArg && screenshotPath) {
    void mainWindow.loadURL(urlArg);
  } else if (isDev) {
    void mainWindow.loadURL(`${DEV_URL}/#${startRoute ?? '/'}`);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'), startRoute ? { hash: startRoute } : undefined);
    pendingRoute = null; // the hash already carries the start route
  }

  const persist = () => mainWindow && saveWindowState(mainWindow);
  mainWindow.on('resize', persist);
  mainWindow.on('move', persist);
  mainWindow.on('close', persist);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/* ---------- screen share picker ---------- */

interface PickerChoice {
  id: string;
  audio: boolean;
}

async function showPicker(sources: Electron.DesktopCapturerSource[]): Promise<PickerChoice | null> {
  return new Promise((resolve) => {
    const picker = new BrowserWindow({
      width: 760,
      height: 580,
      parent: mainWindow ?? undefined,
      modal: true,
      show: false,
      resizable: false,
      minimizable: false,
      maximizable: false,
      title: 'Share screen',
      backgroundColor: '#1c1c1e',
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'picker-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    let settled = false;
    const finish = (choice: PickerChoice | null) => {
      if (settled) return;
      settled = true;
      ipcMain.removeListener('picker:choose', onChoose);
      resolve(choice);
      if (!picker.isDestroyed()) picker.close();
    };
    const onChoose = (event: Electron.IpcMainEvent, choice: PickerChoice | null) => {
      if (event.sender !== picker.webContents) return;
      finish(choice);
    };

    ipcMain.on('picker:choose', onChoose);
    picker.on('closed', () => finish(null));
    picker.once('ready-to-show', () => {
      picker.webContents.send('picker:sources', {
        platform: process.platform,
        sources: sources.map((s) => ({
          id: s.id,
          name: s.name,
          kind: s.id.startsWith('screen:') ? 'screen' : 'window',
          thumbnail: s.thumbnail.toDataURL(),
          appIcon: s.appIcon ? s.appIcon.toDataURL() : null,
        })),
      });
      picker.show();
    });
    void picker.loadFile(path.join(__dirname, 'picker.html'));
  });
}

/* ---------- single instance + protocol ---------- */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    handleArgvDeepLink(argv);
  });
}

if (!isDev) {
  if (process.defaultApp && process.argv.length >= 2) app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  else app.setAsDefaultProtocolClient(PROTOCOL);
}

app.on('open-url', (event, url) => {
  event.preventDefault();
  const route = routeFromDeepLink(url);
  if (route) deliverRoute(route);
});

/* ---------- app lifecycle ---------- */

app.whenReady().then(() => {
  if (process.platform !== 'darwin') Menu.setApplicationMenu(null);

  const ses = session.defaultSession;

  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    if (permission === 'media' && process.platform === 'darwin') {
      // trigger the macOS TCC prompts once; Chromium handles the rest
      void systemPreferences.askForMediaAccess('microphone');
      void systemPreferences.askForMediaAccess('camera');
    }
    callback(ALLOWED_PERMISSIONS.has(permission));
  });
  ses.setPermissionCheckHandler((_wc, permission) => ALLOWED_PERMISSIONS.has(permission));

  ses.setDisplayMediaRequestHandler(
    async (request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen', 'window'],
          thumbnailSize: { width: 320, height: 200 },
          fetchWindowIcons: true,
        });
        const choice = await showPicker(sources);
        const source = choice ? sources.find((s) => s.id === choice.id) : undefined;
        if (!source) {
          // no streams → the page receives NotAllowedError, same as a cancelled browser picker
          callback(undefined as unknown as Electron.Streams);
          return;
        }
        const streams: Electron.Streams = { video: source };
        if (choice?.audio && request.audioRequested && process.platform === 'win32') streams.audio = 'loopback';
        callback(streams);
      } catch (err) {
        console.error('display media request failed', err);
        callback(undefined as unknown as Electron.Streams);
      }
    },
    { useSystemPicker: true }, // macOS 15+: native picker; other platforms fall back to the handler above
  );

  ipcMain.on('desktop:version', (event) => {
    event.returnValue = app.getVersion();
  });

  ipcMain.handle('desktop:openExternal', async (_event, url: unknown) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) await shell.openExternal(url);
  });

  /**
   * Cross-origin JSON requests on behalf of the renderer.
   * Only http(s) URLs, GET/POST, small bodies — this is not a general proxy.
   */
  ipcMain.handle('desktop:request', async (_event, url: unknown, init: unknown) => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) throw new Error('invalid url');
    const opts = (init ?? {}) as { method?: string; headers?: Record<string, string>; body?: string };
    const method = (opts.method ?? 'GET').toUpperCase();
    if (!['GET', 'POST'].includes(method)) throw new Error('unsupported method');
    if (opts.body && opts.body.length > 64 * 1024) throw new Error('body too large');
    const res = await net.fetch(url, {
      method,
      headers: { Accept: 'application/json', ...(opts.headers ?? {}) },
      body: method === 'POST' ? opts.body : undefined,
    });
    const body = await res.text();
    return { status: res.status, body: body.slice(0, 1024 * 1024) };
  });

  createMainWindow();
  handleArgvDeepLink(process.argv);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
