// Preload — exposes a minimal, safe bridge to the web app so it can detect it
// is running inside the desktop shell (e.g. to auto-start the vMix connection).
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  platform: process.platform,
});