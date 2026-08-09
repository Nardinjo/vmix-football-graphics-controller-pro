import React, { useEffect, useState } from 'react';
import { entities as localEntities } from '@/lib/dataLayer';
import { useVmix } from '@/lib/vmixContext';
import { Plus, Trash2, Play, GripVertical, ListVideo, Check, ArrowUp, ArrowDown } from 'lucide-react';
import { PageHeader, Field, Input } from '@/pages/Matches';

const GRAPHICS = ['Score Bug', 'Lower Third', 'Goal Scorer', 'Substitution', 'Yellow Card', 'Red Card', 'VAR Review', 'Statistics', 'Starting XI', 'Formation Graphic', 'Penalty', 'Half Time', 'Full Time', 'Sponsor', 'Ticker', 'Full Screen'];

export default function Playlist() {
  const { addLog, triggerGraphic, activeMatchId } = useVmix();
  const [items, setItems] = useState([]);
  const [adding, setAdding] = useState(null);

  const load = async () => {
    try {
      const list = await localEntities.PlaylistItem.filter(activeMatchId ? { match_id: activeMatchId } : {});
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      setItems(list);
    } catch (e) {}
  };
  useEffect(() => { load(); }, [activeMatchId]);

  const add = async (graphic) => {
    await localEntities.PlaylistItem.create({ name: graphic, graphic, match_id: activeMatchId, order: items.length, status: 'queued' });
    addLog(`Added to playlist: ${graphic}`, 'info');
    setAdding(null);
    await load();
  };
  const remove = async (i) => { await localEntities.PlaylistItem.delete(i.id); setItems((p) => p.filter((x) => x.id !== i.id)); };
  const exec = async (i) => { triggerGraphic(i.graphic); await localEntities.PlaylistItem.update(i.id, { status: 'done' }); addLog(`▶ Executed: ${i.graphic}`, 'graphic'); await load(); };
  const move = async (i, dir) => {
    const idx = items.findIndex((x) => x.id === i.id);
    const swap = items[idx + dir];
    if (!swap) return;
    await Promise.all([localEntities.PlaylistItem.update(i.id, { order: swap.order }), localEntities.PlaylistItem.update(swap.id, { order: i.order })]);
    await load();
  };
  const clearDone = async () => {
    const done = items.filter((i) => i.status === 'done');
    await localEntities.PlaylistItem.deleteMany({ match_id: activeMatchId || undefined, status: 'done' });
    addLog(`Cleared ${done.length} done items`, 'warning');
    await load();
  };

  const statusStyle = { queued: 'text-slate-400 bg-white/5', playing: 'text-blue-400 bg-blue-500/10', done: 'text-green-400 bg-green-500/10' };

  return (
    <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <PageHeader title="Playlist" subtitle="Queue graphics in order for the broadcast rundown" />

        <div className="rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-slate-500 flex items-center gap-2"><ListVideo size={14} /> Queue ({items.length})</span>
            {items.some((i) => i.status === 'done') && <button onClick={clearDone} className="text-xs text-slate-500 hover:text-red-400">Clear done</button>}
          </div>
          {items.length === 0 && <div className="text-center text-slate-500 text-sm py-10">Playlist is empty. Add graphics from the right.</div>}
          <div className="divide-y divide-white/5">
            {items.map((i, idx) => (
              <div key={i.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02]">
                <GripVertical size={14} className="text-slate-600 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => move(i, -1)} disabled={idx === 0} className="text-slate-500 hover:text-white disabled:opacity-20"><ArrowUp size={12} /></button>
                  <button onClick={() => move(i, 1)} disabled={idx === items.length - 1} className="text-slate-500 hover:text-white disabled:opacity-20"><ArrowDown size={12} /></button>
                </div>
                <span className="text-xs font-mono text-slate-500 w-6">{idx + 1}</span>
                <div className="flex-1">
                  <div className="text-sm text-white font-medium">{i.graphic}</div>
                  {i.notes && <div className="text-xs text-slate-500">{i.notes}</div>}
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-medium ${statusStyle[i.status]}`}>{i.status}</span>
                {i.status !== 'done' ? (
                  <button onClick={() => exec(i)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500 text-green-300 hover:text-white text-xs font-medium"><Play size={12} /> Execute</button>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-green-400 px-3"><Check size={12} /> Done</span>
                )}
                <button onClick={() => remove(i)} className="px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 sticky top-20">
          <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2"><Plus size={14} /> Add to Queue</h3>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {GRAPHICS.map((g) => (
              <button key={g} onClick={() => add(g)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 hover:bg-blue-600 text-slate-300 hover:text-white text-sm transition-all">
                <span>{g}</span>
                <Plus size={14} className="opacity-50" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}