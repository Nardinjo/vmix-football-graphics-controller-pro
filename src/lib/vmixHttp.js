// Direct vMix Web API client (no bridge). Talks straight to vMix's built-in
// HTTP Web Controller at http://<host>:<port> (default port 8088).
//
// Browser note: vMix's Web API does not send CORS headers, so a cross-origin
// web app can't READ responses. We send commands with mode:'no-cors' — vMix
// still executes the Function query — and probe reachability the same way.
// Reading the full input list (auto-detect) only works when CORS is allowed
// (e.g. the desktop app with web security off); otherwise the operator maps
// inputs manually on the vMix page.

const now = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

function parseInputs(xml) {
  const list = [];
  if (!xml || typeof xml !== 'string') return list;
  const re = /<input\b([^>]*?)>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const attrs = m[1] || '';
    const get = (k) => {
      const mm = new RegExp('\\b' + k + '\\s*=\\s*"([^"]*)"', 'i').exec(attrs);
      return mm ? mm[1] : '';
    };
    const title = get('title');
    if (!title) continue;
    list.push({ number: get('number'), title, type: get('type'), key: get('key') });
  }
  return list;
}

// Readable fetch — only succeeds when CORS allows reading the response.
async function fetchRead(url, timeoutMs = 5000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(to);
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, text: await res.text() };
  } catch (e) {
    clearTimeout(to);
    return { ok: false, error: e?.name === 'AbortError' ? 'timeout' : 'cors-blocked' };
  }
}

// no-cors probe: resolves { reachable:true } if the host answered (we can't
// read the body, but the request completed). Rejects => unreachable.
function fetchProbe(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs);
    fetch(url, { mode: 'no-cors', signal: ctrl.signal })
      .then(() => { clearTimeout(to); resolve({ reachable: true }); })
      .catch((e) => { clearTimeout(to); resolve({ reachable: false, error: e?.name === 'AbortError' ? 'timeout' : 'unreachable' }); });
  });
}

export function createVmixHttp({ host, port } = {}) {
  const h = host || '127.0.0.1';
  const p = port || 8088;
  const base = `http://${h}:${p}`;
  const apiBase = `${base}/api`;

  function cmdUrl(fn, params) {
    const u = new URL(base + '/');
    u.searchParams.set('Function', fn);
    for (const [k, v] of Object.entries(params || {})) {
      if (v === undefined || v === null || v === '') continue;
      u.searchParams.set(k, String(v));
    }
    return u;
  }

  function cmd(fn, params) {
    return fetchProbe(cmdUrl(fn, params), 4000).then((r) => ({ ok: r.reachable, error: r.error }));
  }

  return {
    available: () => fetchProbe(apiBase, 4000).then((r) => r.reachable),
    ping: async () => {
      const t0 = now();
      const r = await fetchRead(apiBase, 5000);
      if (r.ok && r.text) {
        const reachable = !!(r.text && r.text.trim());
        return { ok: true, ms: Math.round(now() - t0), reachable, inputs: reachable ? parseInputs(r.text) : [] };
      }
      const p = await fetchProbe(apiBase, 5000);
      return { ok: p.reachable, ms: Math.round(now() - t0), reachable: p.reachable, inputs: [], error: p.error };
    },
    setText: (input, field, value) => cmd('SetText', { Input: input, SelectedName: field, Value: value }),
    setImage: (input, field, value) => cmd('SetImage', { Input: input, SelectedName: field, Value: value }),
    overlayIn: (input, layer = 1) => cmd('OverlayIn' + layer, { Input: input }),
    overlayOut: (input, layer = 1) => cmd('OverlayOut' + layer, { Input: input }),
    play: (input) => cmd('Play', { Input: input }),
    pause: (input) => cmd('Pause', { Input: input }),
    restart: (input) => cmd('Restart', { Input: input }),
    triggerShortcut: (key) => cmd('TriggerShortcut', { Value: key }),
    selectInput: (input) => cmd('SelectInput', { Input: input }),
    rawCommand: (cmdStr) => {
      const parts = String(cmdStr || '').replace(/^FUNCTION\s+/i, '').split(/\s+/).filter(Boolean);
      const fn = parts[0];
      const params = {};
      parts.slice(1).forEach((kv) => { const i = kv.indexOf('='); if (i > -1) params[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); });
      return cmd(fn, params);
    },
  };
}