// Electron main process — wraps the built web app (dist/) into a portable
// Windows desktop window. Run after building the web app to dist/.
//
//   1) Build web:       npm run build        (or: vite build)  ->  dist/
//   2) Install desktop:  cd desktop && npm install
//   3) Run dev:          npm start
//   4) Package .exe:     npm run dist         ->  desktop/release/  (vMix Football Pro.exe portable)
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0a0b0f',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Allow the renderer to talk directly to vMix's local HTTP Web API
      // (http://127.0.0.1:8088). vMix sends no CORS headers, so without this
      // the cross-origin reads (status XML / input list) are blocked. No
      // bridge is needed.
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

  // Load the packaged, locally-built UI (no internet, no CDN).
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});