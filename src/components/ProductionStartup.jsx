import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVmix } from '@/lib/vmixContext';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import { versionString } from '@/lib/appVersion';
import { Trophy, Users, Sliders, Plus, X, Radio, Database, WifiOff, Activity } from 'lucide-react';

// Production startup splash — shown once per browser session. Emphasises that
// the app runs locally: local DB + local vMix LAN connection, internet not
// required. Fail-safe: even offline everything except optional cloud stays up.
export default function ProductionStartup() {
  const { connected, connecting, connect, offlineMatchMode } = useVmix();
  const online = useNetworkStatus();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('startup_dismissed') === '1');

  if (dismissed) return null;

  const close = () => { sessionStorage.setItem('startup_dismissed', '1'); setDismissed(true); };

  const Row = ({ label, value, on }) => (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-black/30 border border-white/5">
      <span className={`w-2.5 h-2.5 rounded-full ${on ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
      <span className="text-xs uppercase tracking-widest text-slate-500 w-28">{label}</span>
      <span className={`text-sm font-medium ${on ? 'text-green-400' : 'text-slate-300'}`}>{value}</span>
    </div>
  );

  const Action = ({ icon: Icon, title, sub, to, onClick, accent }) => (
    <button
      onClick={() => { if (onClick) onClick(); else { navigate(to); close(); } }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${accent ? 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white' : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'}`}
    >
      <Icon size={20} className={accent ? 'text-white' : 'text-blue-400'} />
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[11px] opacity-80">{sub}</div>
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#0d0f14] to-black border border-white/10 shadow-2xl overflow-hidden">
        <div className="relative px-7 pt-8 pb-6 bg-gradient-to-r from-blue-700/30 to-transparent border-b border-white/5">
          <button onClick={close} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={18} /></button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold text-white text-lg">vP</div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">VMIX FOOTBALL PRO</h1>
              <p className="text-xs uppercase tracking-[0.2em] text-blue-400">{versionString()}</p>
            </div>
          </div>
          <div className="mt-3 h-px bg-white/10" />
        </div>

        <div className="px-7 py-5 space-y-2">
          <Row label="vMix" value={connected ? 'CONNECTED' : connecting ? 'CONNECTING…' : 'NOT CONNECTED'} on={connected} />
          <Row label="Database" value="LOCAL (IndexedDB)" on />
          <Row label="Internet" value="NOT REQUIRED" on={!online ? false : true} />
          <Row label="Mode" value={offlineMatchMode ? 'OFFLINE / LOCAL' : 'LOCAL'} on />
        </div>

        <div className="px-7 pb-7 grid grid-cols-2 gap-3">
          <Action icon={Trophy} title="Open Match" sub="Resume active production" to="/matches" accent />
          <Action icon={Plus} title="New Match" sub="Create a new fixture" to="/matches" />
          <Action icon={Users} title="Team Library" sub="Teams & players database" to="/teams" />
          <Action icon={Sliders} title="vMix Configuration" sub="Connect & map inputs" to="/settings" />
          {!connected && (
            <button onClick={() => connect()} disabled={connecting} className="col-span-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold disabled:opacity-50">
              <Radio size={16} /> {connecting ? 'Connecting to vMix…' : 'Connect to vMix now'}
            </button>
          )}
        </div>

        <div className="px-7 pb-5 flex items-center justify-center gap-4 text-[10px] text-slate-600">
          <span className="flex items-center gap-1"><Database size={11} /> LOCAL DATABASE</span>
          <span className="flex items-center gap-1"><Activity size={11} /> LOCAL GRAPHICS</span>
          <span className="flex items-center gap-1"><WifiOff size={11} /> NO INTERNET NEEDED</span>
        </div>
      </div>
    </div>
  );
}