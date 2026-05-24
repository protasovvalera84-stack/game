/**
 * Electron preload script — runs in a privileged context but exposes
 * only a minimal API surface to the renderer via contextBridge.
 *
 * The web UI communicates with the embedded Express server via normal
 * HTTP/WebSocket, so almost nothing extra is needed here.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
  },
  /** Open a URL in the system default browser */
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
});
