# vMix Football Pro — Portable Desktop Packaging

This folder turns the (already offline-first) web app into a **standalone
Windows portable application** that needs **no internet, no Base44, no cloud,
no login** during live production. Everything runs locally:

```
LOCAL DESKTOP APP  ->  LOCAL DATABASE (IndexedDB)  ->  LOCAL MEDIA  ->  LOCAL LAN  ->  vMix
```

## What is local

| Concern          | Where it lives                                          |
|------------------|---------------------------------------------------------|
| UI / JS / CSS    | `../dist/` (output of `vite build`, packaged by Electron)|
| Local database   | Browser IndexedDB, persistent on this PC               |
| Team/Player/Match| IndexedDB stores (see `src/lib/dataLayer.js`)           |
| Media (logos/photos)| Uploaded from disk, stored as local data URLs       |
| vMix connection  | `vmix-bridge.js` — TCP to vMix over the LAN            |
| Configuration    | `vmix.json` / `graphics.json` (exported from Settings) |
| Backups          | Single `vMixFootball_Backup_YYYY-MM-DD.json` package   |

## Build the portable .exe (on a Windows 10/11 PC)

```bash
# 1. From the project root — build the web app into dist/
npm install
npm run build          # produces /dist with all assets local (no external CDN)

# 2. Build the desktop shell
cd desktop
npm install
npm run dist           # -> desktop/release/  (vMix Football Pro Portable.exe)
# optional installer:
npm run dist:setup     # -> vMix Football Pro Setup.exe
```

Copy the produced `vMix Football Pro Portable.exe` anywhere (including a USB
stick). Run it directly — no installation required for the portable build.

## Portable folder layout you can ship

```
vMix-Football-Pro/
    vMix-Football-Pro.exe          (the built portable)
    vmix-bridge.exe  / or run:    node vmix-bridge.js
    /data        (auto-created by the app — IndexedDB lives in the browser/Electron profile)
    /media       (logos, player_photos, competition_logos, sponsors)
    /config      (vmix.json, graphics.json — exported from Settings)
    /exports     (CSV / JSON exports)
    /backups     (vMixFootball_Backup_*.json packages)
```

## Running vMix control (real LAN TCP)

A browser cannot open a raw TCP socket, so real vMix control goes through the
tiny local bridge:

```bash
# On the operator laptop (the vMix PC is at 192.168.1.100 on the LAN)
VMIX_HOST=192.168.1.100 VMIX_PORT=8099 node desktop/vmix-bridge.js
# Bridge listens on http://127.0.0.1:8585 and forwards to vMix over TCP.
```

Then the web/desktop app talks to `http://127.0.0.1:8585` automatically
(see `src/lib/vmixBridge.js`). If the bridge is not running, the app falls back
to simulated state — the UI and local database keep working either way.

Supported vMix functions (mapped from the app): `SetText`, `SetImage`,
`OverlayIn1` / `OverlayOut1`, `Play`, `Pause`, `Restart`, `TriggerShortcut`,
`SelectInput`, plus raw commands.

## Updates (manual, offline)

The app never updates automatically. To update:

1. Get a new portable package from your build machine.
2. Replace the `.exe` (keep the local data folder intact).
3. Settings → "Import Update Manifest" to record the new version.

Existing local data (teams, players, matches, media, backups) is preserved.

## Fail-safe

If internet is unavailable the app stays fully operational: UI, local
database, local media, local vMix LAN control, import/export and match
operation all keep working. Only optional cloud sync shows OFFLINE.

## Platform note (read me)

Project files for the desktop shell live in this folder and are real, but the
final Electron `.exe` must be built on a Windows machine that has the repo and
can run `vite build` + `electron-builder`. The console browse-preview cannot
emit a signed Windows executable. Likewise, the packaged app still shares the
web app's auth gate if kept on the Base44 platform; for a fully login-free
portable build you must build from the exported static `dist/` (no Base44
runtime), which is exactly what the steps above produce.