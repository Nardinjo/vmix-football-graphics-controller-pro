// Offline-first data layer. Mirrors the base44.entities API (list/filter/get/
// create/bulkCreate/update/bulkUpdate/updateMany/delete/deleteMany/subscribe)
// so pages switch to local storage by changing the source object only.
//
// On first access for each store, if the browser is online and the local store
// is empty, it lazily bootstraps from the cloud (base44) so existing data is
// available. From then on every read/write is local (IndexedDB) and works with
// no internet. Cloud sync is explicit and optional (pull/push below).
import { localDb } from './localDb';
import { base44 } from '@/api/base44Client';

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));

export const ENTITY_NAMES = ['Team', 'Player', 'Match', 'MatchEvent', 'Statistic', 'LowerThird', 'MediaItem', 'PlaylistItem'];
const booted = {};

function matchQuery(row, q) {
  if (!q) return true;
  for (const k of Object.keys(q)) {
    if (k === '$or') { if (!q[k].some((c) => matchQuery(row, c))) return false; continue; }
    if (k === '$and') { if (!q[k].every((c) => matchQuery(row, c))) return false; continue; }
    const cond = q[k];
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      for (const op of Object.keys(cond)) {
        const v = row[k];
        if (op === '$eq' && v !== cond[op]) return false;
        else if (op === '$ne' && v === cond[op]) return false;
        else if (op === '$gt' && !(v > cond[op])) return false;
        else if (op === '$gte' && !(v >= cond[op])) return false;
        else if (op === '$lt' && !(v < cond[op])) return false;
        else if (op === '$lte' && !(v <= cond[op])) return false;
        else if (op === '$in' && !cond[op].includes(v)) return false;
      }
    } else if (row[k] !== cond) {
      return false;
    }
  }
  return true;
}

function applySort(rows, sort) {
  if (!sort) return rows;
  const desc = String(sort).startsWith('-');
  const field = desc ? String(sort).slice(1) : String(sort);
  return [...rows].sort((a, b) => {
    const av = a[field]; const bv = b[field];
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av < bv) return desc ? 1 : -1;
    if (av > bv) return desc ? -1 : 1;
    return 0;
  });
}

function applyUpdate(row, upd) {
  const out = { ...row };
  for (const op of Object.keys(upd)) {
    if (op === '$set') Object.assign(out, upd[op]);
    else if (op === '$unset') upd[op].forEach((k) => { delete out[k]; });
    else if (op === '$inc') Object.keys(upd[op]).forEach((k) => { out[k] = (out[k] || 0) + upd[op][k]; });
    else if (op === '$push') Object.keys(upd[op]).forEach((k) => { out[k] = [...(out[k] || []), upd[op][k]]; });
    else if (op === '$pull') Object.keys(upd[op]).forEach((k) => { out[k] = (out[k] || []).filter((x) => x !== upd[op][k]); });
    else out[op] = upd[op];
  }
  return out;
}

async function ensureBooted(name) {
  if (booted[name]) return;
  try {
    const count = await localDb.count(name);
    if (count > 0) { booted[name] = true; return; }
    if (navigator.onLine && ENTITY_NAMES.includes(name)) {
      const rows = await base44.entities[name].list();
      if (rows && rows.length) await localDb.putAll(name, rows);
    }
    booted[name] = true; // mark booted whether or not cloud had data
  } catch (e) { /* offline or cloud error — remain unbooted to retry next access */ }
}

function makeEntity(name) {
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => { try { fn({ type: 'change' }); } catch (e) {} });
  return {
    async list(sort, limit) { await ensureBooted(name); let rows = await localDb.getAll(name); rows = applySort(rows, sort); if (limit) rows = rows.slice(0, limit); return rows; },
    async filter(query, sort, limit) { await ensureBooted(name); let rows = await localDb.getAll(name); rows = rows.filter((r) => matchQuery(r, query)); rows = applySort(rows, sort); if (limit) rows = rows.slice(0, limit); return rows; },
    async get(id) { await ensureBooted(name); return localDb.get(name, id); },
    async create(data) { const now = new Date().toISOString(); const rec = { ...data, id: uid(), created_date: now, updated_date: now, created_by_id: 'local' }; await localDb.put(name, rec); emit(); return rec; },
    async bulkCreate(arr) { const out = []; for (const d of arr) out.push(await this.create(d)); return out; },
    async update(id, patch) { const cur = await localDb.get(name, id); if (!cur) throw new Error('Record not found: ' + id); const rec = { ...cur, ...patch, id, updated_date: new Date().toISOString() }; await localDb.put(name, rec); emit(); return rec; },
    async bulkUpdate(arr) { const out = []; for (const item of arr) out.push(await this.update(item.id, item)); return out; },
    async updateMany(query, upd) { const rows = await localDb.getAll(name); const matched = rows.filter((r) => matchQuery(r, query)); for (const r of matched) { const rec = applyUpdate(r, upd); rec.updated_date = new Date().toISOString(); await localDb.put(name, rec); } if (matched.length) emit(); return { modifiedCount: matched.length }; },
    async delete(id) { await localDb.del(name, id); emit(); },
    async deleteMany(query) { const rows = await localDb.getAll(name); const matched = rows.filter((r) => matchQuery(r, query)); for (const r of matched) await localDb.del(name, r.id); if (matched.length) emit(); return { deletedCount: matched.length }; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    schema() { return { type: 'object', properties: {} }; },
  };
}

export const entities = Object.fromEntries(ENTITY_NAMES.map((n) => [n, makeEntity(n)]));

// --- Optional cloud synchronization (only runs when online) ---
export async function syncFromCloud(names = ENTITY_NAMES) {
  if (!navigator.onLine) return { ok: false, reason: 'offline' };
  for (const n of names) {
    try { const rows = await base44.entities[n].list(); await localDb.clear(n); if (rows?.length) await localDb.putAll(n, rows); booted[n] = true; }
    catch (e) { /* continue */ }
  }
  return { ok: true };
}

export async function pushToCloud(names = ENTITY_NAMES) {
  if (!navigator.onLine) return { ok: false, reason: 'offline' };
  for (const n of names) {
    try {
      const local = await localDb.getAll(n);
      const cloud = await base44.entities[n].list();
      const cloudIds = new Set(cloud.map((r) => r.id));
      for (const r of local) {
        const { id, created_date, updated_date, created_by_id, ...patch } = r;
        if (cloudIds.has(id)) { await base44.entities[n].update(id, patch); }
        else { try { await base44.entities[n].create({ ...patch }); } catch (e) {} }
      }
    } catch (e) { /* continue */ }
  }
  return { ok: true };
}

// --- Local backups (snapshots of all stores) ---
export async function createBackup(label) {
  const data = {};
  for (const s of ENTITY_NAMES) { try { data[s] = await localDb.getAll(s); } catch (e) { data[s] = []; } }
  const rec = { id: 'BACKUP_' + new Date().toISOString().replace(/[:.]/g, '-'), label: label || 'Auto Backup', time: new Date().toISOString(), data };
  await localDb.put('Backup', rec);
  return rec;
}

export async function listBackups() {
  const rows = await localDb.getAll('Backup');
  return applySort(rows, '-time');
}

export async function restoreBackup(id) {
  const b = await localDb.get('Backup', id);
  if (!b) return null;
  for (const s of ENTITY_NAMES) { await localDb.clear(s); if (b.data?.[s]?.length) await localDb.putAll(s, b.data[s]); }
  return b;
}

export async function deleteBackup(id) { await localDb.del('Backup', id); }

// Full local database export (used for offline JSON backup files).
export async function exportDatabase() {
  const data = {};
  for (const s of ENTITY_NAMES) { try { data[s] = await localDb.getAll(s); } catch (e) { data[s] = []; } }
  data.__exported_at = new Date().toISOString();
  return data;
}

// Import a full DB blob previously produced by exportDatabase() (or the Full
// Backup Package). Clears each store then restores rows — operator portable
// restore. Keeps each row's existing id so references stay intact.
export async function importDatabase(data) {
  const stores = Object.keys(data || {}).filter((k) => ENTITY_NAMES.includes(k));
  for (const s of stores) {
    await localDb.clear(s);
    const rows = Array.isArray(data[s]) ? data[s] : [];
    if (rows.length) await localDb.putAll(s, rows);
    booted[s] = true;
  }
  return { stores, total: stores.reduce((n, s) => n + (data[s]?.length || 0), 0) };
}