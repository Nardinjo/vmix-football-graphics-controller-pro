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
    req.onsuccess = () => {
      const db = req.result;
      // The connection can be closed by the browser (eviction) or a version
      // change from another tab. Drop the cached promise so the next call
      // reopens — otherwise db.transaction() throws "connection is closing".
      db.onclose = () => { dbPromise = null; };
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => { dbPromise = null; reject(req.error); };
    req.onblocked = () => { dbPromise = null; reject(new Error('IndexedDB upgrade blocked by another tab')); };
  });
  return dbPromise;
}

function reqify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Acquire an object store, retrying once if the cached connection is dead
// (InvalidStateError: "The database connection is closing").
async function openStore(name, mode) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const db = await openDB();
      if (!db.objectStoreNames.contains(name)) { dbPromise = null; continue; }
      return db.transaction(name, mode).objectStore(name);
    } catch (e) {
      lastErr = e;
      dbPromise = null;
    }
  }
  throw lastErr;
}

export const localDb = {
  async getAll(name) { const os = await openStore(name, 'readonly'); return reqify(os.getAll()).then((r) => r || []); },
  async get(name, id) { const os = await openStore(name, 'readonly'); return reqify(os.get(id)).then((r) => r || null); },
  async put(name, val) { const os = await openStore(name, 'readwrite'); await reqify(os.put(val)); return val; },
  async putAll(name, vals) {
    let lastErr;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const db = await openDB();
        if (!db.objectStoreNames.contains(name)) { dbPromise = null; continue; }
        return await new Promise((resolve, reject) => {
          const t = db.transaction(name, 'readwrite');
          const os = t.objectStore(name);
          vals.forEach((v) => os.put(v));
          t.oncomplete = () => resolve(vals);
          t.onerror = () => reject(t.error);
          t.onabort = () => reject(t.error);
        });
      } catch (e) { lastErr = e; dbPromise = null; }
    }
    throw lastErr;
  },
  async del(name, id) { const os = await openStore(name, 'readwrite'); return reqify(os.delete(id)); },
  async clear(name) { const os = await openStore(name, 'readwrite'); return reqify(os.clear()); },
  async count(name) { const os = await openStore(name, 'readonly'); return reqify(os.count()).then((r) => r || 0); },
  STORES,
};