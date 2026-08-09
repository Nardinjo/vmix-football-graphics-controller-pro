import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useVmix } from '@/lib/vmixContext';
import { Plus, Save, Trash2, X, AlignLeft, Play, EyeOff } from 'lucide-react';
import { PageHeader, Field, Input, Select } from '@/pages/Matches';

const EMPTY = { name: '', type: 'player', title: '', subtitle: '', team_id: '', color: '#3b82f6' };

export default function LowerThirds() {
  const { addLog, triggerGraphic } = useVmix();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [teams, setTeams] = useState([]);

  const load = async () => {
    try {
      const [lt, ts] = await Promise.all([base44.entities.LowerThird.list(), base44.entities.Team.list()]);
      setItems(lt); setTeams(ts);
    } catch (e) {}
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.name || !editing.title) { addLog('Name and title required', 'warning'); return; }
    if (editing.id) { await base44.entities.LowerThird.update(editing.id, editing); addLog('Lower third updated', 'success'); }
    else { const c = await base44.entities.LowerThird.create(editing); setItems((p) => [c, ...p]); }
    setEditing(null); await load();
  };
  const remove = async (i) => { await base44.entities.LowerThird.delete(i.id); addLog('Lower third deleted', 'warning'); setItems((p) => p.filter((x) => x.id !== i.id)); };
  const animate = (i) => { triggerGraphic(`Lower Third: ${i.title}`); addLog(`Lower third animated in: ${i.title}`, 'graphic'); };
  const animateOut = (i) => { addLog(`Lower third animated out: ${i.title}`, 'warning'); };

  const teamColor = (id) => teams.find((t) => t.id === id)?.primary_color || '#3b82f6';
  const preview = editing || items[0];

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      <PageHeader title="Lower Thirds" subtitle="Custom name straps for players, coaches, officials and reporters" onAdd={() => setEditing({ ...EMPTY })} addLabel="New Lower Third" />

      {/* Preview */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 h-56 sm:h-64 relative overflow-hidden flex items-end">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 60%)' }} />
        {preview ? (
          <div className="relative mb-8 ml-6 sm:ml-10 max-w-md">
            <div className="flex items-stretch">
              <div className="w-1.5 rounded-l" style={{ background: preview.color || teamColor(preview.team_id) }} />
              <div className="bg-black/80 backdrop-blur-md px-5 py-3 rounded-r-lg">
                <div className="text-xs uppercase tracking-widest text-slate-400">{preview.type}</div>
                <div className="text-xl font-bold text-white leading-tight">{preview.title}</div>
                {preview.subtitle && <div className="text-sm text-slate-300 mt-0.5">{preview.subtitle}</div>}
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">Create a lower third to preview</div>
        )}
      </div>

      {editing && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">{editing.id ? 'Edit' : 'New'} Lower Third</h3>
            <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name"><Input value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} /></Field>
            <Field label="Type"><Select value={editing.type} onChange={(v) => setEditing({ ...editing, type: v })} options={[{ id: 'player', name: 'Player' }, { id: 'coach', name: 'Coach' }, { id: 'official', name: 'Official' }, { id: 'reporter', name: 'Reporter' }, { id: 'commentator', name: 'Commentator' }, { id: 'sponsor', name: 'Sponsor' }, { id: 'custom', name: 'Custom' }]} /></Field>
            <Field label="Title Line"><Input value={editing.title} onChange={(v) => setEditing({ ...editing, title: v })} /></Field>
            <Field label="Subtitle Line"><Input value={editing.subtitle} onChange={(v) => setEditing({ ...editing, subtitle: v })} /></Field>
            <Field label="Team (optional)"><Select value={editing.team_id} onChange={(v) => setEditing({ ...editing, team_id: v })} options={teams} /></Field>
            <Field label="Accent Color"><div className="flex items-center gap-2"><input type="color" value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} className="w-10 h-10 rounded bg-transparent border border-white/10 cursor-pointer" /><Input value={editing.color} onChange={(v) => setEditing({ ...editing, color: v })} /></div></Field>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"><Save size={16} /> Save</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((i) => (
          <div key={i.id} className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 hover:border-white/10 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-8 rounded" style={{ background: i.color || teamColor(i.team_id) }} />
              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase text-slate-500">{i.type}</div>
                <div className="text-white font-medium text-sm truncate">{i.title}</div>
              </div>
            </div>
            {i.subtitle && <div className="text-xs text-slate-400 mb-3">{i.subtitle}</div>}
            <div className="flex gap-1.5 mt-3">
              <button onClick={() => animate(i)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 hover:bg-green-500 text-green-300 hover:text-white text-xs font-medium"><Play size={13} /> Animate In</button>
              <button onClick={() => animateOut(i)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs"><EyeOff size={13} /> Out</button>
              <button onClick={() => setEditing(i)} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs"><AlignLeft size={13} /></button>
              <button onClick={() => remove(i)} className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-slate-500 text-sm col-span-full text-center py-10">No lower thirds yet.</div>}
      </div>
    </div>
  );
}