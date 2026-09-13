import React, { useState } from 'react';
import { useVmix } from '@/lib/vmixContext';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import { GRAPHIC_KEYS, SHORTCUT_ACTIONS } from '@/lib/vmixDefaults';
import { Wifi, WifiOff, Plug, PlugZap, RefreshCw, MonitorPlay, Keyboard, ChevronDown, ChevronRight, Activity, Database, Eraser } from 'lucide-react';

export default function Vmix() {
  const vmix = useVmix();
  const online = useNetworkStatus();
  const { settings, updateSettings, connected, connecting, connect, disconnect, test, refreshInputs, vmixInputs, graphicInputMap, fieldMap, shortcuts, setGraphicInput, setField, setShortcut, lastCommand, log } = vmix;
  const [openGraphic, setOpenGraphic] = useState(null);
  const [testRes, setTestRes] = useState(null);

  const runTest = async () => { setTestRes(await test()); };
  const inputCls = 'px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white outline-none focus:border-blue-500';
  const labelCls = 'block text-xs text-slate-400 mb-1.5';

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><MonitorPlay size={22} className="text-blue-400" /> vMix</h1>
        <p className="text-sm text-slate-400 mt-1">Connection, input mapping, field mapping and shortcuts — all saved locally.</p>
      </div>

      {/* Connection */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Wifi size={16} className="text-blue-400" /> Connection</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div><label className={labelCls}>vMix IP Address</label><input value={settings.ip} onChange={(e) => updateSettings({ ip: e.target.value })} className={inputCls + ' w-full'} /></div>
          <div><label className={labelCls}>Web API Port (8088)</label><input type="number" value={settings.port} onChange={(e) => updateSettings({ port: Number(e.target.value) })} className={inputCls + ' w-full'} /></div>
          <div className="flex items-center gap-2">
            {!connected ? <button onClick={connect} disabled={connecting} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium disabled:opacity-50"><Plug size={15} /> {connecting ? 'Connecting…' : 'Connect'}</button>
              : <button onClick={disconnect} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-sm font-medium"><PlugZap size={15} /> Disconnect</button>}
            <button onClick={runTest} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm"><Activity size={15} /> Test</button>
            <button onClick={refreshInputs} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm"><RefreshCw size={15} /> Refresh</button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 flex-wrap text-xs">
          <span className={`px-3 py-1.5 rounded-lg border ${connected ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{connected ? 'VMIX CONNECTED' : 'VMIX DISCONNECTED'}</span>
          {testRes && <span className={`px-3 py-1.5 rounded-lg border ${testRes.ok ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>TEST {testRes.ok ? 'OK' : 'FAILED'} {testRes.ms ? `· ${testRes.ms}ms` : ''}</span>}
          <span className="text-slate-500">Available inputs ({vmixInputs.length}): {vmixInputs.join(', ') || '— none —'}</span>
          <span className={`px-3 py-1.5 rounded-lg border ${online ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>INTERNET {online ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-3">Live control talks straight to vMix's Web API at <code className="text-blue-300">{settings.ip}:{settings.port}</code> — enable <code className="text-blue-300">vMix → Settings → Web Controller</code>. If unreachable, commands are simulated but still logged. From the published HTTPS site the browser blocks local HTTP, so run the app locally or as the desktop app for live control.</p>
      </div>

      {/* Input mapping */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Database size={16} className="text-blue-400" /> Graphic → vMix Input Mapping</h3>
          <button onClick={() => GRAPHIC_KEYS.forEach((g) => setGraphicInput(g, ''))} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs"><Eraser size={13} /> Clear all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase tracking-wider">
              <tr><th className="text-left px-3 py-2">Graphic</th><th className="text-left px-3 py-2">vMix Input</th><th className="px-3 py-2">Fields</th></tr>
            </thead>
            <tbody>
              {GRAPHIC_KEYS.map((g) => {
                const isOpen = openGraphic === g;
                const fields = fieldMap[g] || {};
                const inputVal = graphicInputMap[g] || '';
                const inputOptions = vmixInputs.length ? vmixInputs : [];
                return (
                  <React.Fragment key={g}>
                    <tr className="border-t border-white/5">
                      <td className="px-3 py-2 text-white">{g}</td>
                      <td className="px-3 py-2">
                        <input value={inputVal} onChange={(e) => setGraphicInput(g, e.target.value)} list="vmix-inputs" placeholder="vMix input name / number" className={inputCls + ' w-full'} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => setOpenGraphic(isOpen ? null : g)} className="text-xs text-blue-300 hover:text-blue-200 flex items-center gap-1 mx-auto">{Object.keys(fields).length} fields {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-black/20">
                        <td colSpan={3} className="px-3 py-3">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {Object.keys(fields).map((key) => (
                              <div key={key}>
                                <label className={labelCls}>{key}</label>
                                <input value={fields[key]} onChange={(e) => setField(g, key, e.target.value)} className={inputCls + ' w-full'} />
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          <datalist id="vmix-inputs">{vmixInputs.map((i) => <option key={i} value={i} />)}</datalist>
        </div>
        <p className="text-[11px] text-slate-500 mt-3">Set the vMix input for each graphic, then expand to map your data fields to the vMix text field names inside that input. Changes save automatically.</p>
      </div>

      {/* Keyboard shortcuts */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Keyboard size={16} className="text-blue-400" /> Keyboard Shortcuts</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {SHORTCUT_ACTIONS.map((a) => {
            const key = Object.keys(shortcuts).find((k) => shortcuts[k] === a.id) || '';
            return (
              <div key={a.id} className="rounded-lg bg-black/20 border border-white/5 p-3">
                <div className="text-xs text-slate-400 mb-1">{a.label}</div>
                <input value={key} placeholder="—" onChange={(e) => setShortcut(a.id, e.target.value.toUpperCase())} className={inputCls + ' w-full text-center font-mono'} />
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500 mt-3">Defaults: F1 Goal · F2 Yellow · F3 Red · F4 Sub · F5 Lower 3rd · F6 Coach · F7 Lineup · F8 Stats · F9 VAR · F10 Clear · Space Start/Pause clock.</p>
      </div>

      {/* Command log */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Activity size={16} className="text-blue-400" /> vMix Command Log</h3>
        {lastCommand ? (
          <div className="text-xs text-slate-300 mb-3">Last: <span className="text-white font-medium">{lastCommand.command}</span> · {lastCommand.graphic} {lastCommand.input ? `→ "${lastCommand.input}"` : ''} · <span className={lastCommand.result === 'sent' ? 'text-green-400' : 'text-amber-400'}>{lastCommand.result}</span> · {new Date(lastCommand.time).toLocaleTimeString('en-GB')}</div>
        ) : <div className="text-xs text-slate-500 mb-3">No commands sent yet.</div>}
        <div className="space-y-1 max-h-[240px] overflow-y-auto">
          {log.filter((l) => l.message && (l.type === 'graphic' || /VMix|Overlay|SetText|Graphic/i.test(l.message))).slice(0, 60).map((l) => (
            <div key={l.id} className="flex items-center gap-3 text-xs px-2 py-1 rounded bg-white/[0.02]">
              <span className="text-slate-500 font-mono shrink-0">{new Date(l.time).toLocaleTimeString('en-GB')}</span>
              <span className={`shrink-0 w-16 ${l.type === 'graphic' ? 'text-blue-300' : l.type === 'warning' ? 'text-amber-400' : l.type === 'success' ? 'text-green-400' : 'text-slate-400'}`}>{l.type || 'info'}</span>
              <span className="text-slate-200 truncate">{l.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}