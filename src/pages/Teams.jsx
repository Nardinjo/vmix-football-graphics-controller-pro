import React, { useEffect, useState } from 'react';
import { entities as localEntities } from '@/lib/dataLayer';
import { useVmix } from '@/lib/vmixContext';
import { Plus, Save, Trash2, X, Users, Flag, User, Download } from 'lucide-react';
import { downloadCSV } from '@/lib/localFile';
import ConfirmDialog from '@/components/ConfirmDialog';
import { PageHeader, Field, Input } from '@/pages/Matches';

const EMPTY = { name: '', short_name: '', nickname: '', country: '', league: '', logo_url: '', crest_url: '', primary_color: '#1e3a8a', secondary_color: '#ffffff', coach: '', captain: '' };

export default function Teams() {
  const { addLog } = useVmix();
  const [teams, setTeams] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  const load = async () => { setLoading(true); try { setTeams(await localEntities.Team.list()); } catch (e) {} setLoading(false); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.name || !editing.short_name) { addLog('Team name and short name required', 'warning'); return; }
    if (editing.id) { await localEntities.Team.update(editing.id, editing); addLog(`Team updated: ${editing.name}`, 'success'); }
    else { const c = await localEntities.Team.create(editing); addLog(`Team created: ${editing.name}`, 'success'); setTeams((p) => [c, ...p]); setEditing(null); return; }
    await load(); setEditing(null);
  };
  const remove = async (t) => {
    let count = 0;
    try { const ps = await localEntities.Player.filter({ team_id: t.id }); count = ps.length; } catch (e) {}
    setConfirm({
      title: `Delete team "${t.name}"?`,
      message: count
        ? `This team has ${count} linked player(s). They will remain in the database with a stale team link — reassign or delete them afterwards.`
        : 'This action cannot be undone.',
      details: count ? `Linked players: ${count}` : null,
      confirmLabel: count ? 'Delete anyway' : 'Delete',
      onConfirm: async () => {
        try {
          await localEntities.Team.delete(t.id);
          addLog(`Team deleted: ${t.name}${count ? ` (${count} orphaned players)` : ''}`, 'warning');
          setTeams((p) => p.filter((x) => x.id !== t.id));
        } catch (e) { addLog('Failed to delete team', 'warning'); }
        setConfirm(null);
      }
    });
  };

  const exportCsv = () => {
    const cols = ['name', 'short_name', 'nickname', 'country', 'league', 'logo_url', 'crest_url', 'primary_color', 'secondary_color', 'coach', 'assistant_coach', 'captain', 'formation'];
    downloadCSV(`teams-${new Date().toISOString().slice(0, 10)}.csv`, teams, cols);
    addLog(`Exported ${teams.length} teams to CSV`, 'success');
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {confirm && <ConfirmDialog title={confirm.title} message={confirm.message} details={confirm.details} confirmLabel={confirm.confirmLabel} onCancel={() => setConfirm(null)} onConfirm={confirm.onConfirm} />}
      <PageHeader title="Team Management" subtitle="Manage clubs, colors, coaches and captains" onAdd={() => setEditing({ ...EMPTY })} addLabel="New Team" />
      <div className="flex justify-end -mt-2">
        <button onClick={exportCsv} disabled={!teams.length} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium disabled:opacity-40"><Download size={14} /> Export CSV</button>
      </div>

      {editing && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">{editing.id ? 'Edit Team' : 'New Team'}</h3>
            <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Team Name"><Input value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} /></Field>
            <Field label="Short Name"><Input value={editing.short_name} onChange={(v) => setEditing({ ...editing, short_name: v })} placeholder="RMA" /></Field>
            <Field label="Country"><Input icon={Flag} value={editing.country} onChange={(v) => setEditing({ ...editing, country: v })} /></Field>
            <Field label="League"><Input value={editing.league} onChange={(v) => setEditing({ ...editing, league: v })} /></Field>
            <Field label="Nickname"><Input value={editing.nickname} onChange={(v) => setEditing({ ...editing, nickname: v })} placeholder="The Reds" /></Field>
            <Field label="Logo URL (PNG)"><Input value={editing.logo_url} onChange={(v) => setEditing({ ...editing, logo_url: v })} /></Field>
            <Field label="Club Crest URL"><Input value={editing.crest_url} onChange={(v) => setEditing({ ...editing, crest_url: v })} /></Field>
            <Field label="Coach"><Input icon={User} value={editing.coach} onChange={(v) => setEditing({ ...editing, coach: v })} /></Field>
            <Field label="Captain"><Input value={editing.captain} onChange={(v) => setEditing({ ...editing, captain: v })} /></Field>
            <Field label="Primary Color"><div className="flex items-center gap-2"><input type="color" value={editing.primary_color} onChange={(e) => setEditing({ ...editing, primary_color: e.target.value })} className="w-10 h-10 rounded bg-transparent border border-white/10 cursor-pointer" /><Input value={editing.primary_color} onChange={(v) => setEditing({ ...editing, primary_color: v })} /></div></Field>
            <Field label="Secondary Color"><div className="flex items-center gap-2"><input type="color" value={editing.secondary_color} onChange={(e) => setEditing({ ...editing, secondary_color: e.target.value })} className="w-10 h-10 rounded bg-transparent border border-white/10 cursor-pointer" /><Input value={editing.secondary_color} onChange={(v) => setEditing({ ...editing, secondary_color: v })} /></div></Field>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"><Save size={16} /> Save Team</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading && <div className="text-slate-500 text-sm col-span-full">Loading teams...</div>}
        {!loading && teams.length === 0 && <div className="text-slate-500 text-sm col-span-full text-center py-10">No teams yet.</div>}
        {teams.map((t) => (
          <div key={t.id} className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 hover:border-white/10 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold shrink-0" style={{ background: t.primary_color, color: t.secondary_color }}>{t.short_name?.slice(0,3) || t.name?.slice(0,3)}</div>
              <div className="min-w-0 flex-1">
                <div className="text-white font-medium text-sm truncate">{t.name}</div>
                <div className="text-xs text-slate-500">{t.country} · {t.league}</div>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-xs text-slate-400">
              <div className="flex items-center gap-1.5"><User size={11} /> Coach: <span className="text-slate-300">{t.coach || '—'}</span></div>
              <div className="flex items-center gap-1.5"><Users size={11} /> Captain: <span className="text-slate-300">{t.captain || '—'}</span></div>
            </div>
            <div className="flex gap-1.5 mt-4">
              <button onClick={() => setEditing(t)} className="flex-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs"><Save size={13} className="inline mr-1" /> Edit</button>
              <button onClick={() => remove(t)} className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}