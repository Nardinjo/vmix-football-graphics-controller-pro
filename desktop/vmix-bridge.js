// vMix LAN Bridge — tiny localhost HTTP server that forwards real commands to
// vMix over TCP on the local network. This is what makes the browser/UI able
// to control vMix without Electron, and it also works the same way inside the
// packaged desktop app.
//
//   Run on the operator laptop:   node desktop/vmix-bridge.js
//   (or:                  )        VMIX_HOST=192.168.1.100 VMIX_PORT=8099 node desktop/vmix-bridge.js
//
//   Bridge:      http://127.0.0.1:8585   (BRIDGE_PORT env to change)
//   vMix target: <VMIX_HOST>:<VMIX_PORT> (defaults 127.0.0.1:8099)
//
// The web app posts to this bridge (see src/lib/vmixBridge.js). Internet is
// never used. No Base44, no cloud.

const http = require('http');
const net = require('net');

const VMIX_HOST = process.env.VMIX_HOST || '127.0.0.1';
const VMIX_PORT = parseInt(process.env.VMIX_PORT || '8099', 10);
const BRIDGE_PORT = parseInt(process.env.BRIDGE_PORT || '8585', 10);

// Open a TCP socket to vMix, send one command, collect the reply, then close.
function vmixSend(command, timeoutMs = 1500) {
  return new Promise((resolve, reject) => {
    let buf = '';
    const sock = net.createConnection({ host: VMIX_HOST, port: VMIX_PORT }, () => {
      sock.write(command + '\r\n');
    });
    sock.on('data', (d) => { buf += d.toString(); });
    sock.on('end', () => resolve(buf));
    sock.on('error', reject);
    setTimeout(() => { try { sock.destroy(); } catch (e) {} resolve(buf || null); }, timeoutMs);
  });
}

// Build a vMix "FUNCTION <Name> Key=Value ..." command from the JSON body.
function buildFunction(p) {
  const params = [];
  for (const k of Object.keys(p)) {
    if (['function', 'cmd'].includes(k)) continue;
    if (p[k] === undefined || p[k] === null || p[k] === '') continue;
    params.push(`${k}=${String(p[k]).replace(/ /g, '%20')}`);
  }
  return `FUNCTION ${p.function}${params.length ? ' ' + params.join(' ') : ''}`;
}

// Parse <input .../> entries from vMix's XML response into a list of
// { number, title, type, key } so the app can detect titles already in the
// project and auto-map them to graphics on connect.
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

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  let body = '';
  for await (const chunk of req) body += chunk;
  let p = {};
  try { p = body ? JSON.parse(body) : {}; } catch (e) { p = {}; }

  try {
    if (req.url === '/ping') {
      const t0 = Date.now();
      let xml = '';
      let reachable = false;
      try { xml = await vmixSend('XML', 4000); reachable = !!(xml && xml.trim()); } catch (e) { reachable = false; }
      const ms = Date.now() - t0;
      const inputs = reachable ? parseInputs(xml) : [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        ok: true, ms, reachable,
        host: VMIX_HOST, port: VMIX_PORT,
        inputs,
      }));
    }
    if (req.url === '/command') {
      if (p.function === 'Raw' && p.cmd) await vmixSend(p.cmd);
      else await vmixSend(buildFunction(p));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, sent: p.function }));
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'not found' }));
  } catch (e) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: e.message }));
  }
});

server.listen(BRIDGE_PORT, '127.0.0.1', () => {
  console.log(`vMix bridge  http://127.0.0.1:${BRIDGE_PORT}  ->  ${VMIX_HOST}:${VMIX_PORT}`);
});

process.on('SIGINT', () => { server.close(); process.exit(0); });