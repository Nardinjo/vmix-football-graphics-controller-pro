import React, { useEffect, useState } from 'react';
import { entities as localEntities } from '@/lib/dataLayer';
import { useVmix } from '@/lib/vmixContext';
import { Plus, Save, Trash2, X, Image, Video, Search, Film, Upload } from 'lucide-react';
import { PageHeader, Field, Input, Select } from '@/pages/Matches';

const EMPTY = { name: '', type: 'team_logo', category: '', url: '', tags: '' };

export default function Media() {
  const { addLog } = useVmix();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const TYPES = [
    { id: 'player_photo', label: 'Player Photos', icon: Image },
    { id: 'team_logo', label: 'Team Logos', icon: Image },
    { id: 'competition_logo', label: 'Competition Logos', icon: Image },
    { id: 'sponsor', label: 'Sponsors', icon: Image },
    { id: 'background', label: 'Backgrounds', icon: Film },
    { id: 'video', label: 'Videos', icon: Video },
  ];

  const load = async () => { setLoading(true); try { setItems(await localEntities.MediaItem.list()); } catch (e) {} setLoading(false); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.name || !editing.url) { addLog('Name and URL required', 'warning'); return; }
    if (editing.id) { await localEntities.MediaItem.update(editing.id, editing); addLog('Media updated', 'success'); }
    else { const c = await localEntities.MediaItem.create(editing); setItems((p) => [c, ...p]); }
    setEditing(null); await load();
  };
  const remove = async (i) => { await localEntities.MediaItem.delete(i.id); addLog('Media deleted', 'warning'); setItems((p) => p.filter((x) => x.id !== i.id)); };

  const isVideo = (url) => /\.(mp4|webm|mov)$/i.test(url || '');
  const filtered = items.filter((i) => (filter === 'all' || i.type === filter) && (i.name?.toLowerCase().includes(query.toLowerCase()) || i.tags?.toLowerCase().includes(query.toLowerCase())));

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      <PageHeader title="Media Library" subtitle="Store photos, logos, sponsors, backgrounds and videos" onAdd={() => setEditing({ ...EMPTY })} addLabel="Add Media" />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg flex-1 min-w-[200px]">
          <Search size={15} className="text-slate-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search media..." className="bg-transparent text-sm outline-none flex-1 placeholder:text-slate-600" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {[{ id: 'all', label: 'All' }, ...TYPES].map((t) => (
            <button key={t.id} onClick={() => setFilter(t.id)} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${filter === t.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>{t.label}</button>
          ))}
        </div>
      </div>

      {editing && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">{editing.id ? 'Edit' : 'New'} Media</h3>
            <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name"><Input value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} /></Field>
            <Field label="Type"><Select value={editing.type} onChange={(v) => setEditing({ ...editing, type: v })} options={TYPES} labelKey="label" /></Field>
            <Field label="Category"><Input value={editing.category} onChange={(v) => setEditing({ ...editing, category: v })} /></Field>
            <Field label="Tags"><Input value={editing.tags} onChange={(v) => setEditing({ ...editing, tags: v })} /></Field>
            <div className="col-span-full">
              <Field label="File URL"><Input value={editing.url} onChange={(v) => setEditing({ ...editing, url: v })} /></Field>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"><Save size={16} /> Save</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {loading && <div className="text-slate-500 text-sm col-span-full text-center py-10">Loading...</div>}
        {!loading && filtered.length === 0 && <div className="text-slate-500 text-sm col-span-full text-center py-10">No media found.</div>}
        {filtered.map((i) => (
          <div key={i.id} className="group rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden hover:border-white/10 transition-all">
            <div className="aspect-square bg-black/30 flex items-center justify-center overflow-hidden">
              {isVideo(i.url) ? <Video className="text-slate-600" size={32} /> : i.url ? <img src={i.url} alt={i.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <Image className="text-slate-600" size={32} />}
            </div>
            <div className="p-3">
              <div className="text-sm text-white font-medium truncate">{i.name}</div>
              <div className="text-[10px] uppercase text-slate-500">{i.type.replace(/_/g, ' ')}</div>
              <div className="flex gap-1 mt-2">
                <button onClick={() => setEditing(i)} className="flex-1 px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs"><Upload size={12} className="inline mr-1" /> Use</button>
                <button onClick={() => remove(i)} className="px-2 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs"><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}