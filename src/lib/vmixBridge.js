// Thin client for the OPTIONAL local desktop bridge (desktop/vmix-bridge.js).
// A browser/web app cannot open a raw TCP socket to vMix directly, so on a
// laptop the operator runs the tiny Node bridge on 127.0.0.1; this module
// talks to it over localhost HTTP, which then forwards real vMix TCP commands
// over the LAN to the vMix PC. If the bridge is not running, every call
// resolves to { ok:false } and the app falls back to simulated state — UI
// and local database keep working regardless.
const BRIDGE_URL = (typeof window !== 'undefined' && window.__VMIX_BRIDGE_URL__) || 'http://127.0.0.1:8585';

async function post(path, body) {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(BRIDGE_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
      signal: ctrl.signal,
    });
    clearTimeout(to);
    if (!res.ok) return { ok: false, status: res.status };
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return await res.json();
    return { ok: true, raw: await res.text() };
  } catch (e) {
    return { ok: false, error: e?.message || 'unreachable' };
  }
}

export const vmixBridge = {
  available: () => post('/ping').then((r) => !!r.ok),
  ping: () => post('/ping'),
  // vMix TCP API functions
  setText: (input, field, value) => post('/command', { function: 'SetText', input, field, value }),
  setImage: (input, field, value) => post('/command', { function: 'SetImage', input, field, value }),
  overlayIn: (input, layer = 1) => post('/command', { function: 'OverlayIn' + layer, input }),
  overlayOut: (input, layer = 1) => post('/command', { function: 'OverlayOut' + layer, input }),
  play: (input) => post('/command', { function: 'Play', input }),
  pause: (input) => post('/command', { function: 'Pause', input }),
  restart: (input) => post('/command', { function: 'Restart', input }),
  triggerShortcut: (key) => post('/command', { function: 'TriggerShortcut', key }),
  selectInput: (input) => post('/command', { function: 'SelectInput', input }),
  rawCommand: (cmd) => post('/command', { function: 'Raw', cmd }),
};