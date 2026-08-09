// Application version + manual update metadata (offline-first).
// No automatic online updates — the operator updates the portable app
// manually by replacing it with a new package.
export const APP_VERSION = {
  version: '1.0.0',
  build: '2026-08-09',
  channel: 'stable',
  name: 'vMix Football Graphics Controller Pro',
};

export function versionString() {
  return `v${APP_VERSION.version} (build ${APP_VERSION.build}, ${APP_VERSION.channel})`;
}

// Validates a manually-imported update manifest (a .json describing the
// new build). Real replacement of the executable is an OS-level operation.
export function validateUpdateManifest(text) {
  try {
    const m = JSON.parse(text);
    return !!(m && m.version && m.build);
  } catch (e) {
    return false;
  }
}