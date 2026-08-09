import React, { useState } from 'react';
import { useVmix } from '@/lib/vmixContext';
import { ScrollText, Trash2, Filter } from 'lucide-react';

export default function Logs() {
  const { log, addLog } = useVmix();
  const [filter, setFilter] = useState('all');

  const types = ['all', 'success', 'warning', 'graphic', 'info'];
  const filtered = filter === 'all' ? log : log.filter((l) => l.type === filter);

  const colorMap = {
    success: 'bg-green-500', warning: 'bg-amber-500', graphic: 'bg-blue-500', info: 'bg-slate-500',
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><ScrollText size={22} className="text-blue-400" /> Activity Log</h1>
          <p className="text-sm text-slate-400 mt-1">Real-time log of all broadcast actions and events</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-500" />
          <div className="flex gap-1">
            {types.map((t) => (
              <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${filter === t ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs text-slate-500">{filtered.length} entries</span>
          <button onClick={() => addLog('Log cleared', 'info')} className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1"><Trash2 size={12} /> Clear</button>
        </div>
        <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 && <div className="text-center text-slate-500 text-sm py-10">No log entries</div>}
          {filtered.map((l) => (
            <div key={l.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02]">
              <span className={`w-2 h-2 rounded-full shrink-0 ${colorMap[l.type] || colorMap.info}`} />
              <span className="text-sm text-slate-200 flex-1">{l.message}</span>
              <span className="text-xs text-slate-500 font-mono tabular-nums">{new Date(l.time).toLocaleTimeString('en-GB')}</span>
              <span className="text-[10px] uppercase text-slate-600 w-16 text-right">{l.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}