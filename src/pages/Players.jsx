import React, { useEffect, useState } from 'react';
import { entities as localEntities } from '@/lib/dataLayer';
import { useVmix } from '@/lib/vmixContext';
import { Plus, Save, Trash2, X, User, Flag, Star, Download } from 'lucide-react';
import { downloadCSV } from '@/lib/localFile';
import ConfirmDialog from '@/components/ConfirmDialog';
import { PageHeader, Field, Input, Select } from '@/pages/Matches';

const EMPTY = { number: 1, full_name: '', short_name: '', position: 'MID', age: 18, birthday: '', nationality: '', height: '', weight: '', photo_url: '', team_id: '', is_captain: false, is_vice_captain: false, is_starting: false, is_substitute: false, preferred_foot: 'Right' };

export default function Players() {
  const { addLog } = useVmix();
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamFilter, setTeamFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const [ps, ts] = await Promise.all([localEntities.Player.list(), localEntities.Team.list()]); setPlayers(ps); setTeams(ts); } catch (e) {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const teamName = (id) => teams.find((t) => t.id === id)?.short_name || '—';
  const filtered = teamFilter ? players.filter((p) => p.team_id === teamFilter) : players;

  const save = async () => {
    if (!editing.full_name || !editing.team_id) { addLog('Player name and team required', 'warning'); return; }
    if (editing.id) { await localEntities.Player.update(editing.id, editing); addLog(`Player updated: ${editing.full_name}`, 'success'); }
    else { const c = await localEntities.Player.create(editing); addLog(`Player created: ${editing.full_name}`, 'success'); setPlayers((p) => [c, ...p]); setEditing(null); return; }
    await load(); setEditing(null);
  };
  const remove = async (p) => {
    let count = 0;
    try { const evs = await localEntities.MatchEvent.filter({ player_id: p.id }); count = evs.length; } catch (e) {}
    setConfirm({
      title: `Delete player "${p.full_name}"?`,
      message: count
        ? `${count} match event(s) reference this player and will remain in the timeline showing their name.`
        : 'This action cannot be undone.',
      details: count ? `Linked events: ${count}` : null,
      confirmLabel: count ? 'Delete anyway' : 'Delete',
      onConfirm: async () => {
        try {
          await localEntities.Player.delete(p.id);
          addLog(`Player deleted${count ? ` (${count} events kept)` : ''}`, 'warning');
          setPlayers((x) => x.filter((i) => i.id !== p.id));
        } catch (e) { addLog('Failed to delete player', 'warning'); }
        setConfirm(null);
      }
    });
  };

  const posColor = { GK: 'bg-amber-500/20 text-amber-400', DEF: 'bg-blue-500/20 text-blue-400', MID: 'bg-green-500/20 text-green-400', FWD: 'bg-red-500/20 text-red-400' };

  const exportCsv = () => {
    const rows = filtered.map((p) => ({ ...p, team: teamName(p.team_id) }));
    const cols = ['number', 'full_name', 'short_name', 'position', 'age', 'birthday', 'nationality', 'height', 'weight', 'photo_url', 'team', 'is_captain', 'is_vice_captain', 'is_starting', 'is_substitute', 'preferred_foot'];
    downloadCSV(`players-${new Date().toISOString().slice(0, 10)}.csv`, rows, cols);
    addLog(`Exported ${rows.length} players to CSV`, 'success');
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {confirm && <ConfirmDialog title={confirm.title} message={confirm.message} details={confirm.details} confirmLabel={confirm.confirmLabel} onCancel={() => setConfirm(null)} onConfirm={confirm.onConfirm} />}
      <PageHeader title="Player Database" subtitle="Unlimited players with full profile data" onAdd={() => setEditing({ ...EMPTY })} addLabel="New Player" />

      <div className="flex items-center gap-3">
        <div className="w-56"><Select value={teamFilter} onChange={setTeamFilter} options={[{ id: '', name: 'All Teams' }, ...teams]} /></div>
        <span className="text-xs text-slate-500">{filtered.length} players</span>
        <button onClick={exportCsv} disabled={!filtered.length} className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium disabled:opacity-40"><Download size={14} /> Export CSV</button>
      </div>

      {editing && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">{editing.id ? 'Edit Player' : 'New Player'}</h3>
            <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Number"><Input type="number" value={editing.number} onChange={(v) => setEditing({ ...editing, number: Number(v) })} /></Field>
            <Field label="Full Name"><Input value={editing.full_name} onChange={(v) => setEditing({ ...editing, full_name: v })} /></Field>
            <Field label="Short Name"><Input value={editing.short_name} onChange={(v) => setEditing({ ...editing, short_name: v })} /></Field>
            <Field label="Team"><Select value={editing.team_id} onChange={(v) => setEditing({ ...editing, team_id: v })} options={teams} /></Field>
            <Field label="Position"><Select value={editing.position} onChange={(v) => setEditing({ ...editing, position: v })} options={[{ id: 'GK', name: 'Goalkeeper' }, { id: 'DEF', name: 'Defender' }, { id: 'MID', name: 'Midfielder' }, { id: 'FWD', name: 'Forward' }]} /></Field>
            <Field label="Age"><Input type="number" value={editing.age} onChange={(v) => setEditing({ ...editing, age: Number(v) })} /></Field>
            <Field label="Birthday"><Input type="date" value={editing.birthday} onChange={(v) => setEditing({ ...editing, birthday: v })} /></Field>
            <Field label="Nationality"><Input icon={Flag} value={editing.nationality} onChange={(v) => setEditing({ ...editing, nationality: v })} /></Field>
            <Field label="Preferred Foot"><Select value={editing.preferred_foot} onChange={(v) => setEditing({ ...editing, preferred_foot: v })} options={[{ id: 'Left', name: 'Left' }, { id: 'Right', name: 'Right' }, { id: 'Both', name: 'Both' }]} /></Field>
            <Field label="Height"><Input value={editing.height} onChange={(v) => setEditing({ ...editing, height: v })} placeholder="180 cm" /></Field>
            <Field label="Weight"><Input value={editing.weight} onChange={(v) => setEditing({ ...editing, weight: v })} placeholder="75 kg" /></Field>
            <Field label="Photo URL"><Input value={editing.photo_url} onChange={(v) => setEditing({ ...editing, photo_url: v })} /></Field>
            <div className="flex items-end gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"><input type="checkbox" checked={!!editing.is_captain} onChange={(e) => setEditing({ ...editing, is_captain: e.target.checked })} className="accent-blue-500" /> Captain</label>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"><input type="checkbox" checked={!!editing.is_vice_captain} onChange={(e) => setEditing({ ...editing, is_vice_captain: e.target.checked })} className="accent-blue-500" /> Vice Captain</label>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"><input type="checkbox" checked={!!editing.is_starting} onChange={(e) => setEditing({ ...editing, is_starting: e.target.checked })} className="accent-blue-500" /> Starting XI</label>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"><input type="checkbox" checked={!!editing.is_substitute} onChange={(e) => setEditing({ ...editing, is_substitute: e.target.checked })} className="accent-blue-500" /> Substitute</label>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"><Save size={16} /> Save Player</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Player</th>
                <th className="text-left px-4 py-3 font-medium">Team</th>
                <th className="text-left px-4 py-3 font-medium">Pos</th>
                <th className="text-left px-4 py-3 font-medium">Age</th>
                <th className="text-left px-4 py-3 font-medium">Nat</th>
                <th className="text-left px-4 py-3 font-medium">C</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center text-slate-500 py-8">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={8} className="text-center text-slate-500 py-8">No players found.</td></tr>}
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-slate-400 font-mono">{p.number}</td>
                  <td className="px-4 py-3 text-white font-medium flex items-center gap-2"><User size={14} className="text-slate-500" /> {p.full_name}</td>
                  <td className="px-4 py-3 text-slate-300">{teamName(p.team_id)}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${posColor[p.position]}`}>{p.position}</span></td>
                  <td className="px-4 py-3 text-slate-400">{p.age}</td>
                  <td className="px-4 py-3 text-slate-400">{p.nationality}</td>
                  <td className="px-4 py-3">{p.is_captain ? <Star size={14} className="text-amber-400 fill-amber-400" /> : p.is_vice_captain ? <Star size={14} className="text-slate-500" /> : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditing(p)} className="px-2 py-1 rounded text-xs text-slate-300 hover:bg-white/10"><Save size={13} /></button>
                    <button onClick={() => remove(p)} className="px-2 py-1 rounded text-xs text-red-400 hover:bg-red-500/10 ml-1"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}