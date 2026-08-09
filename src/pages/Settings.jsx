import React, { useState } from 'react';
import { useVmix } from '@/lib/vmixContext';
import { Sliders, Wifi, WifiOff, User, Save, RefreshCw, Check, X, Cloud, Download, Upload } from 'lucide-react';

export default function Settings() {
  const { settings, updateSettings, connected, connecting, connect, disconnect, operatorName, setOperatorName, addLog } = useVmix();
  const [form, setForm] = useState(settings);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const save = () => { updateSettings(form); addLog('Settings saved', 'success'); };

  const test = () => {
    setTesting(true); setTestResult(null);
    setTimeout(() => { setTesting(false); setTestResult('success'); addLog(`Connection test to ${form.ip}:${form.port}`, 'success'); }, 800);
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Sliders size={22} className="text-blue-400" /> Settings</h1>
        <p className="text-sm text-slate-400 mt-1">vMix connection, operator profile and data management</p>
      </div>

      {/* vMix Connection */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Wifi size={16} className="text-blue-400" /> vMix TCP Connection</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">vMix IP Address</label>
            <input value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} placeholder="127.0.0.1"
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">TCP Port</label>
            <input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white outline-none focus:border-blue-500" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.autoReconnect} onChange={(e) => setForm({ ...form, autoReconnect: e.target.checked })} className="accent-blue-500 w-4 h-4" />
              Auto Reconnect
            </label>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-5">
          <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"><Save size={16} /> Save Settings</button>
          <button onClick={test} disabled={testing} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm disabled:opacity-50"><RefreshCw size={16} className={testing ? 'animate-spin' : ''} /> {testing ? 'Testing...' : 'Test Connection'}</button>
          {testResult === 'success' && <span className="flex items-center gap-1 text-sm text-green-400"><Check size={15} /> Connection successful</span>}
          {connected ? (
            <button onClick={disconnect} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm border border-red-500/20 ml-auto"><WifiOff size={16} /> Disconnect</button>
          ) : (
            <button onClick={connect} disabled={connecting} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium ml-auto disabled:opacity-50"><Wifi size={16} /> {connecting ? 'Connecting...' : 'Connect'}</button>
          )}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${connected ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {connected ? <Check size={14} /> : <X size={14} />} {connected ? 'Connected' : 'Disconnected'}
          </div>
          <span className="text-xs text-slate-500">Endpoint: {form.ip}:{form.port}</span>
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

      {/* API Integrations */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Cloud size={16} className="text-blue-400" /> API Data Sources</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {['AllSportsAPI', 'API-Football', 'Football-Data.org', 'Sportmonks', 'LiveScore', 'Flashscore'].map((api) => (
            <div key={api} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 text-sm">
              <span className="text-slate-300">{api}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-500/20 text-slate-400">Manual</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">Connect a data source to auto-populate matches, teams and live scores. Manual mode is active by default.</p>
      </div>

      {/* Data Management */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Data Management</h3>
        <div className="flex flex-wrap gap-2">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm"><Download size={16} /> Export Database</button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm"><Upload size={16} /> Import Database</button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm"><Cloud size={16} /> Cloud Backup</button>
        </div>
      </div>
    </div>
  );
}