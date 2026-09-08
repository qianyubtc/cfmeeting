import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('picker', {
  onSources: (cb: (payload: unknown) => void) => {
    ipcRenderer.on('picker:sources', (_event, payload) => cb(payload));
  },
  choose: (id: string, audio: boolean) => ipcRenderer.send('picker:choose', { id, audio }),
  cancel: () => ipcRenderer.send('picker:choose', null),
});
