// Minimal IndexedDB wrapper — the offline-first local database for all match data.
const DB_NAME = 'vmix_football_local';
const DB_VERSION = 1;
export const STORES = [
  'Team', 'Player', 'Match', 'MatchEvent', 'Statistic',
  'LowerThird', 'MediaItem', 'PlaylistItem', 'Backup', 'Setting',
];

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      STORES.forEach((s) => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' }); });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function store(name, mode) {
  return openDB().then((db) => db.transaction(name, mode).objectStore(name));
}

function reqify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const localDb = {
  async getAll(name) { const os = await store(name, 'readonly'); return reqify(os.getAll()).then((r) => r || []); },
  async get(name, id) { const os = await store(name, 'readonly'); return reqify(os.get(id)).then((r) => r || null); },
  async put(name, val) { const os = await store(name, 'readwrite'); await reqify(os.put(val)); return val; },
  async putAll(name, vals) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(name, 'readwrite');
      const os = t.objectStore(name);
      vals.forEach((v) => os.put(v));
      t.oncomplete = () => resolve(vals);
      t.onerror = () => reject(t.error);
    });
  },
  async del(name, id) { const os = await store(name, 'readwrite'); return reqify(os.delete(id)); },
  async clear(name) { const os = await store(name, 'readwrite'); return reqify(os.clear()); },
  async count(name) { const os = await store(name, 'readonly'); return reqify(os.count()).then((r) => r || 0); },
  STORES,
};