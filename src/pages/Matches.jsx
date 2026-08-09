import React, { useEffect, useState } from 'react';
import { entities as localEntities } from '@/lib/dataLayer';
import { useVmix } from '@/lib/vmixContext';
import { Plus, Save, Copy, Trash2, Upload, X, Trophy, MapPin, User, Cloud, Thermometer } from 'lucide-react';

const EMPTY = { home_team_id: '', away_team_id: '', competition: '', venue: '', kickoff_time: '', match_id: '', referee: '', weather: '', temperature: '', attendance: 0, status: 'scheduled', home_score: 0, away_score: 0, current_half: 1, current_minute: 0, is_active: false };

export default function Matches() {
  const { setActiveMatch, addLog } = useVmix();
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState({});
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [ms, ts] = await Promise.all([localEntities.Match.list(), localEntities.Team.list()]);
      setMatches(ms);
      const m = {}; ts.forEach((t) => (m[t.id] = t)); setTeams(m);
    } catch (e) {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const teamName = (id) => teams[id]?.name || '—';

  const save = async () => {
    if (!editing.home_team_id || !editing.away_team_id || !editing.competition) { addLog('Match requires home, away and competition', 'warning'); return; }
    if (editing.id) {
      await localEntities.Match.update(editing.id, editing);
      addLog(`Match updated`, 'success');
    } else {
      const created = await localEntities.Match.create(editing);
      addLog(`Match created`, 'success');
      setMatches((p) => [created, ...p]);
      setEditing(null); return;
    }
    await load(); setEditing(null);
  };

  const duplicate = async (m) => {
    const { id, created_date, updated_date, created_by_id, ...rest } = m;
    const dup = await localEntities.Match.create({ ...rest, match_id: rest.match_id + ' (copy)', is_active: false, home_score: 0, away_score: 0, current_minute: 0, status: 'scheduled' });
    addLog('Match duplicated', 'success'); setMatches((p) => [dup, ...p]);
  };

  const remove = async (m) => {
    await localEntities.Match.delete(m.id);
    addLog('Match deleted', 'warning'); setMatches((p) => p.filter((x) => x.id !== m.id));
  };

  const activate = async (m) => {
    await localEntities.Match.updateMany({ is_active: true }, { $set: { is_active: false } });
    await localEntities.Match.update(m.id, { is_active: true, status: 'live' });
    setActiveMatch(m.id);
    addLog(`Match loaded: ${teamName(m.home_team_id)} vs ${teamName(m.away_team_id)}`, 'success');
    await load();
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      <PageHeader title="Match Management" subtitle="Create, edit and load matches into the broadcast" onAdd={() => setEditing({ ...EMPTY })} />

      {editing && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">{editing.id ? 'Edit Match' : 'New Match'}</h3>
            <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Home Team"><Select value={editing.home_team_id} onChange={(v) => setEditing({ ...editing, home_team_id: v })} options={Object.values(teams)} /></Field>
            <Field label="Away Team"><Select value={editing.away_team_id} onChange={(v) => setEditing({ ...editing, away_team_id: v })} options={Object.values(teams)} /></Field>
            <Field label="Competition"><Input value={editing.competition} onChange={(v) => setEditing({ ...editing, competition: v })} placeholder="UEFA Champions League" /></Field>
            <Field label="Venue"><Input icon={MapPin} value={editing.venue} onChange={(v) => setEditing({ ...editing, venue: v })} /></Field>
            <Field label="Kickoff Time"><Input type="datetime-local" value={editing.kickoff_time} onChange={(v) => setEditing({ ...editing, kickoff_time: v })} /></Field>
            <Field label="Match ID"><Input value={editing.match_id} onChange={(v) => setEditing({ ...editing, match_id: v })} /></Field>
            <Field label="Referee"><Input icon={User} value={editing.referee} onChange={(v) => setEditing({ ...editing, referee: v })} /></Field>
            <Field label="Weather"><Input icon={Cloud} value={editing.weather} onChange={(v) => setEditing({ ...editing, weather: v })} /></Field>
            <Field label="Temperature"><Input icon={Thermometer} value={editing.temperature} onChange={(v) => setEditing({ ...editing, temperature: v })} /></Field>
            <Field label="Attendance"><Input type="number" value={editing.attendance} onChange={(v) => setEditing({ ...editing, attendance: Number(v) })} /></Field>
            <Field label="Status"><Select value={editing.status} onChange={(v) => setEditing({ ...editing, status: v })} options={[{ id: 'scheduled' }, { id: 'live' }, { id: 'halftime' }, { id: 'finished' }]} labelKey="id" /></Field>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"><Save size={16} /> Save Match</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && <div className="text-slate-500 text-sm col-span-full">Loading matches...</div>}
        {!loading && matches.length === 0 && <div className="text-slate-500 text-sm col-span-full text-center py-10">No matches yet. Create one to get started.</div>}
        {matches.map((m) => (
          <div key={m.id} className={`rounded-2xl border p-5 transition-all ${m.is_active ? 'bg-blue-600/10 border-blue-500/30' : 'bg-white/[0.03] border-white/5'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-slate-500">{m.competition || 'Friendly'}</span>
              <StatusBadge status={m.status} active={m.is_active} />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center text-xs font-bold mb-1" style={{ background: teams[m.home_team_id]?.primary_color || '#1e3a8a', color: teams[m.home_team_id]?.secondary_color || '#fff' }}>{teams[m.home_team_id]?.short_name?.slice(0,3) || 'HOM'}</div>
                <div className="text-xs text-slate-300">{teamName(m.home_team_id)}</div>
              </div>
              <div className="text-2xl font-bold text-white tabular-nums px-3">{m.home_score} : {m.away_score}</div>
              <div className="text-center flex-1">
                <div className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center text-xs font-bold mb-1" style={{ background: teams[m.away_team_id]?.primary_color || '#9a1a1a', color: teams[m.away_team_id]?.secondary_color || '#fff' }}>{teams[m.away_team_id]?.short_name?.slice(0,3) || 'AWY'}</div>
                <div className="text-xs text-slate-300">{teamName(m.away_team_id)}</div>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-3 flex items-center gap-1"><MapPin size={12} /> {m.venue || 'TBD'} · {m.kickoff_time ? new Date(m.kickoff_time).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : 'No kickoff'}</div>
            <div className="flex gap-1.5 mt-4">
              <button onClick={() => activate(m)} className="flex-1 px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-medium transition-all"><Upload size={13} className="inline mr-1" /> Load</button>
              <button onClick={() => setEditing(m)} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs"><Save size={13} /></button>
              <button onClick={() => duplicate(m)} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs"><Copy size={13} /></button>
              <button onClick={() => remove(m)} className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, onAdd, addLabel = 'Add New' }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Trophy size={22} className="text-blue-400" /> {title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {onAdd && <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-lg shadow-blue-600/20"><Plus size={16} /> {addLabel}</button>}
    </div>
  );
}

export function Field({ label, children }) {
  return <div><label className="block text-xs text-slate-400 mb-1.5">{label}</label>{children}</div>;
}
export function Input({ value, onChange, placeholder, type = 'text', icon: Icon }) {
  return (
    <div className="relative">
      {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />}
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white outline-none focus:border-blue-500 transition-colors`} />
    </div>
  );
}
export function Select({ value, onChange, options, labelKey = 'name', valueKey = 'id' }) {
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white outline-none focus:border-blue-500 transition-colors">
      <option value="">— Select —</option>
      {options.map((o) => <option key={o[valueKey]} value={o[valueKey]}>{o[labelKey]}</option>)}
    </select>
  );
}
function StatusBadge({ status, active }) {
  const map = { scheduled: 'bg-slate-500/20 text-slate-300', live: 'bg-red-500/20 text-red-400', halftime: 'bg-amber-500/20 text-amber-400', finished: 'bg-blue-500/20 text-blue-400' };
  return <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-medium ${map[status] || map.scheduled}`}>{active ? 'Active' : status}</span>;
}