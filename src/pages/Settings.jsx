import React, { useEffect, useState } from 'react';
import { useVmix } from '@/lib/vmixContext';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import { entities as localEntities, createBackup, listBackups, restoreBackup, deleteBackup, syncFromCloud, pushToCloud, exportDatabase, importDatabase } from '@/lib/dataLayer';
import { downloadJSON, downloadCSV } from '@/lib/localFile';
import { versionString, validateUpdateManifest } from '@/lib/appVersion';
import { Sliders, Wifi, WifiOff, User, Save, RefreshCw, Check, X, Cloud, Download, Upload, Database, HardDrive, RotateCcw, Trash2, CloudDownload, CloudUpload, Activity } from 'lucide-react';

export default function Settings() {
  const { settings, updateSettings, connected, connecting, connect, disconnect, operatorName, setOperatorName, addLog, lastConnection, responseTime, test, vmixInputs, refreshInputs, offlineMatchMode, setOfflineMatchMode, activeMatchId } = useVmix();
  const online = useNetworkStatus();
  const [form, setForm] = useState(settings);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [backups, setBackups] = useState([]);
  const [busy, setBusy] = useState('');

  const loadBackups = async () => { try { setBackups(await listBackups()); } catch (e) {} };
  useEffect(() => { loadBackups(); }, []);

  const save = () => { updateSettings(form); addLog('Settings saved', 'success'); };

  const runTest = async () => {
    setTesting(true); setTestResult(null);
    const res = await test();
    setTestResult(res);
    setTesting(false);
  };

  const doBackup = async () => {
    setBusy('backup');
    try { const b = await createBackup('Manual Backup'); await loadBackups(); addLog(`Backup created: ${b.label}`, 'success'); } catch (e) {}
    setBusy('');
  };

  const doRestore = async (id) => {
    setBusy('restore-' + id);
    try { await restoreBackup(id); addLog('Backup restored', 'success'); } catch (e) {}
    setBusy('');
  };

  const doDeleteBackup = async (id) => { await deleteBackup(id); await loadBackups(); addLog('Backup deleted', 'warning'); };

  const pullCloud = async () => { setBusy('pull'); try { await syncFromCloud(); addLog('Pulled data from cloud', 'success'); } catch (e) {} setBusy(''); };
  const pushCloud = async () => { setBusy('push'); try { await pushToCloud(); addLog('Pushed local data to cloud', 'success'); } catch (e) {} setBusy(''); };

  const exportDB = async () => {
    const data = await exportDatabase();
    downloadJSON(`MATCH_BACKUP_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`, data);
    addLog('Database exported (JSON)', 'success');
  };

  const exportTeamsCSV = async () => {
    const teams = await localEntities.Team.list();
    downloadCSV('TEAM.csv', teams, ['name', 'short_name', 'country', 'league', 'coach', 'captain', 'primary_color', 'secondary_color']);
    addLog('Teams exported (CSV)', 'success');
  };

  const exportMatchEventsCSV = async () => {
    const ev = await localEntities.MatchEvent.list();
    downloadCSV('MATCH_EVENTS.csv', ev, ['minute', 'type', 'team_id', 'player_name', 'reason']);
    addLog('Match events exported (CSV)', 'success');
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Sliders size={22} className="text-blue-400" /> Settings</h1>
        <p className="text-sm text-slate-400 mt-1">vMix connection, diagnostics, offline mode, backups and data management</p>
      </div>

      {/* Offline status banner */}
      <div className={`rounded-2xl p-5 border ${online ? 'bg-green-500/5 border-green-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-sm font-semibold text-white">{online ? 'ONLINE' : 'OFFLINE'}</span>
            <span className="text-xs text-slate-400">· Internet {online ? 'available' : 'unavailable — app runs on local data'} · vMix {connected ? 'CONNECTED' : 'DISCONNECTED'}</span>
          </div>
          {!online && connected && <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">LOCAL NETWORK · MATCH READY</span>}
        </div>
      </div>

      {/* vMix Connection + Diagnostics */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Wifi size={16} className="text-blue-400" /> vMix Connection & Diagnostics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">vMix IP Address (local LAN)</label>
            <input value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} placeholder="192.168.1.100"
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Web API Port (8088)</label>
            <input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} placeholder="8088"
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white outline-none focus:border-blue-500" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.autoReconnect} onChange={(e) => setForm({ ...form, autoReconnect: e.target.checked })} className="accent-blue-500 w-4 h-4" />
              Auto Reconnect
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <Diag label="Connection Status" value={connected ? 'Connected' : 'Disconnected'} good={connected} />
          <Diag label="Endpoint" value={`${form.ip}:${form.port}`} />
          <Diag label="Last Successful" value={lastConnection ? new Date(lastConnection).toLocaleTimeString('en-GB') : '—'} />
          <Diag label="Response Time" value={responseTime != null ? `${responseTime} ms` : '—'} good={responseTime != null} />
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-5">
          <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"><Save size={16} /> Save Settings</button>
          <button onClick={runTest} disabled={testing} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm disabled:opacity-50"><RefreshCw size={16} className={testing ? 'animate-spin' : ''} /> {testing ? 'Testing...' : 'Test'}</button>
          <button onClick={refreshInputs} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm"><Database size={16} /> Refresh Inputs</button>
          {testResult && (testResult.ok
            ? <span className="flex items-center gap-1 text-sm text-green-400"><Check size={15} /> Test OK ({testResult.ms} ms)</span>
            : <span className="flex items-center gap-1 text-sm text-red-400"><X size={15} /> No response</span>)}
          {connected ? (
            <button onClick={disconnect} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm border border-red-500/20 ml-auto"><WifiOff size={16} /> Disconnect</button>
          ) : (
            <button onClick={connect} disabled={connecting} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium ml-auto disabled:opacity-50"><Wifi size={16} /> {connecting ? 'Connecting...' : 'Connect'}</button>
          )}
        </div>

        {vmixInputs.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/5">
            <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">vMix Inputs</div>
            <div className="flex flex-wrap gap-2">
              {vmixInputs.map((i, idx) => (
                <span key={idx} className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10">{idx} · {i}</span>
              ))}
            </div>
          </div>
        )}
        <p className="text-xs text-slate-600 mt-3">Connects directly to vMix's Web API at <span className="text-slate-400">{form.ip}:{form.port}</span> — enable <span className="text-slate-400">vMix → Settings → Web Controller</span> (default port 8088). No bridge, no internet required. From the published HTTPS site the browser blocks local HTTP — run locally or as the desktop app for live control.</p>
      </div>

      {/* Offline Match Mode */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Activity size={16} className="text-purple-400" /> Offline Match Mode</h3>
            <p className="text-xs text-slate-400 mt-1">Disables cloud/API calls and runs entirely on the local database and local vMix connection.</p>
          </div>
          <button onClick={() => setOfflineMatchMode(!offlineMatchMode)} className={`relative w-14 h-8 rounded-full transition-colors ${offlineMatchMode ? 'bg-purple-600' : 'bg-white/10'}`}>
            <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${offlineMatchMode ? 'translate-x-6' : ''}`} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 text-xs">
          <span className="px-2 py-1 rounded bg-white/5 text-slate-300">OFFLINE MATCH MODE {offlineMatchMode ? 'ON' : 'OFF'}</span>
          <span className="px-2 py-1 rounded bg-white/5 text-slate-300">LOCAL DATA</span>
          <span className={`px-2 py-1 rounded ${connected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>VMIX {connected ? 'CONNECTED' : 'DISCONNECTED'}</span>
        </div>
      </div>

      {/* Operator Profile */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><User size={16} className="text-blue-400" /> Operator Profile</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Operator Name</label>
            <input value={operatorName} onChange={(e) => setOperatorName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white outline-none focus:border-blue-500" />
          </div>
        </div>
      </div>

      {/* Local Backups */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><HardDrive size={16} className="text-blue-400" /> Local Backups & Snapshots</h3>
          <button onClick={doBackup} disabled={busy === 'backup'} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50"><Save size={16} /> {busy === 'backup' ? 'Saving...' : 'Backup Now'}</button>
        </div>
        <p className="text-xs text-slate-500 mb-3">Auto-saved snapshots are stored locally in IndexedDB. Restoring replaces current local data.</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {backups.length === 0 && <div className="text-xs text-slate-500 py-4 text-center">No snapshots yet.</div>}
          {backups.map((b) => (
            <div key={b.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5">
              <HardDrive size={14} className="text-slate-500" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{b.label}</div>
                <div className="text-[10px] text-slate-500 font-mono">{new Date(b.time).toLocaleString('en-GB')}</div>
              </div>
              <button onClick={() => doRestore(b.id)} disabled={busy === 'restore-' + b.id} className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs flex items-center gap-1 disabled:opacity-50"><RotateCcw size={12} /> {busy === 'restore-' + b.id ? '...' : 'Restore'}</button>
              <button onClick={() => doDeleteBackup(b.id)} className="px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Data Management / Export / Import (offline) */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Database size={16} className="text-blue-400" /> Data Management (Offline Export / Import)</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportDB} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm"><Download size={16} /> Export Database (JSON)</button>
          <button onClick={exportTeamsCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm"><Download size={16} /> Export Teams (CSV)</button>
          <button onClick={exportMatchEventsCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm"><Download size={16} /> Export Events (CSV)</button>
        </div>
        <p className="text-xs text-slate-500 mt-3">All exports run locally in your browser — no internet required. Use the Data Import page to load CSV/JSON from USB or disk.</p>
      </div>

      {/* Version & Updates */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><RefreshCw size={16} className="text-blue-400" /> Version & Updates</h3>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-white text-lg font-bold">{versionString()}</div>
            <div className="text-xs text-slate-500 mt-0.5">No automatic online updates. Replace the portable package to update; local data is preserved.</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-2 rounded-lg bg-white/5 text-slate-300 text-xs border border-white/10">CURRENT VERSION</span>
            <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium cursor-pointer">
              <Upload size={16} /> Import Update Manifest
              <input type="file" accept=".json" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; if (!f) return;
                const r = new FileReader();
                r.onload = () => { const ok = validateUpdateManifest(r.result); addLog(ok ? 'Update manifest accepted — replace the portable app folder to apply' : 'Invalid update manifest', ok ? 'success' : 'warning'); };
                r.readAsText(f);
              }} />
            </label>
          </div>
        </div>
      </div>

      {/* Configuration Files */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Sliders size={16} className="text-blue-400" /> Configuration Files (vmix.json / graphics.json)</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => downloadJSON('vmix.json', { vMix: { ip: form.ip, port: form.port, autoReconnect: form.autoReconnect }, activeMatchId, offlineMatchMode })} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm"><Download size={16} /> Export vmix.json</button>
          <button onClick={() => downloadJSON('graphics.json', { inputs: vmixInputs, shortcuts: { F1: 'Score Bug', F2: 'Lower Third', F3: 'Goal', F4: 'Substitution', F5: 'Yellow Card', F6: 'Red Card', F7: 'VAR Review', F8: 'Statistics', F9: 'Starting XI', F10: 'Full Screen' }, fieldMapping: {} })} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm"><Download size={16} /> Export graphics.json</button>
        </div>
      </div>

      {/* Full Backup Package & Restore */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><HardDrive size={16} className="text-blue-400" /> Full Backup Package & Restore</h3>
        <p className="text-xs text-slate-500 mb-3">A single portable package: local database + vMix config + graphics config. Copy it to another laptop to transfer the entire production environment.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={async () => { const data = await exportDatabase(); downloadJSON(`vMixFootball_Backup_${new Date().toISOString().slice(0, 10)}.json`, { app: versionString(), generatedAt: new Date().toISOString(), config: { vMix: { ip: form.ip, port: form.port }, graphics: { inputs: vmixInputs } }, database: data }); addLog('Full backup package exported', 'success'); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"><Download size={16} /> Export Backup Package (JSON)</button>
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm cursor-pointer">
            <Upload size={16} /> Restore from File
            <input type="file" accept=".json" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const r = new FileReader();
              r.onload = async () => { try { const d = JSON.parse(r.result); const res = await importDatabase(d.database || d); await loadBackups(); addLog(`Restored ${res.total} records from backup file`, 'success'); } catch (err) { addLog('Restore failed: invalid backup file', 'warning'); } };
              r.readAsText(f);
            }} />
          </label>
        </div>
        <div className="text-xs text-slate-600 mt-3">On Windows, zip the exported JSON alongside the /media folder to also transfer logos & player photos.</div>
      </div>

      {/* Optional Cloud Sync */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Cloud size={16} className="text-blue-400" /> Optional Cloud Sync</h3>
        <p className="text-xs text-slate-500 mb-3">Cloud sync is <span className="text-slate-400">optional</span>. Local data is always the primary source during live production. Sync only when online.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={pullCloud} disabled={!online || busy === 'pull'} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm disabled:opacity-40"><CloudDownload size={16} /> {busy === 'pull' ? 'Syncing...' : 'Pull from Cloud'}</button>
          <button onClick={pushCloud} disabled={!online || busy === 'push'} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm disabled:opacity-40"><CloudUpload size={16} /> {busy === 'push' ? 'Syncing...' : 'Push to Cloud'}</button>
        </div>
      </div>
    </div>
  );
}

function Diag({ label, value, good }) {
  return (
    <div className="rounded-lg bg-black/30 border border-white/5 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-sm font-medium mt-0.5 ${good ? 'text-green-400' : 'text-white'}`}>{value}</div>
    </div>
  );
}