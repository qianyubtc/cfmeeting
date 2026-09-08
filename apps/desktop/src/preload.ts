import { contextBridge, ipcRenderer } from 'electron';

const bridge = {
  platform: process.platform,
  version: ipcRenderer.sendSync('desktop:version') as string,
  request: (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) =>
    ipcRenderer.invoke('desktop:request', url, init) as Promise<{ status: number; body: string }>,
  openExternal: (url: string) => ipcRenderer.invoke('desktop:openExternal', url) as Promise<void>,
  onNavigate: (cb: (path: string) => void) => {
    const listener = (_event: unknown, route: string) => cb(route);
    ipcRenderer.on('desktop:navigate', listener);
    return () => ipcRenderer.removeListener('desktop:navigate', listener);
  },
};

contextBridge.exposeInMainWorld('desktop', bridge);
