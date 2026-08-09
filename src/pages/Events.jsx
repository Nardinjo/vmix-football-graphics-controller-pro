import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useVmix } from '@/lib/vmixContext';
import { Goal, ArrowRightLeft, Square, Clock, Trash2, Activity, Plus } from 'lucide-react';
import { PageHeader, Field, Select, Input } from '@/pages/Matches';

export default function Events() {
  const { addLog, activeMatchId } = useVmix();
  const [tab, setTab] = useState('goal');
  const [match, setMatch] = useState(null);
  const [teams, setTeams] = useState({});
  const [players, setPlayers] = useState([]);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ team_id: '', player_id: '', minute: 0, assist: '', own_goal: false, penalty: false, var: false, reason: '', player_out: '', player_in: '', card_type: 'yellow' });

  const load = async () => {
    try {
      const [matches, ts, ps] = await Promise.all([base44.entities.Match.list(), base44.entities.Team.list(), base44.entities.Player.list()]);
      const map = {}; ts.forEach((t) => (map[t.id] = t)); setTeams(map);
      const m = matches.find((x) => x.is_active) || (activeMatchId ? matches.find((x) => x.id === activeMatchId) : null);
      if (!m) return;
      setMatch(m); setPlayers(ps.filter((p) => p.team_id === m.home_team_id || p.team_id === m.away_team_id));
      const ev = await base44.entities.MatchEvent.filter({ match_id: m.id });
      setEvents(ev.sort((a, b) => (b.minute || 0) - (a.minute || 0)));
    } catch (e) {}
  };
  useEffect(() => { load(); }, [activeMatchId]);

  const reloadEvents = async () => { if (!match) return; const ev = await base44.entities.MatchEvent.filter({ match_id: match.id }); setEvents(ev.sort((a, b) => (b.minute || 0) - (a.minute || 0))); };

  const submitGoal = async () => {
    if (!form.team_id || !form.player_id || !form.minute) { addLog('Select team, player and minute', 'warning'); return; }
    const player = players.find((p) => p.id === form.player_id);
    const isOwn = form.own_goal;
    const side = form.team_id === match.home_team_id ? (isOwn ? 'away' : 'home') : (isOwn ? 'home' : 'away');
    const field = side === 'home' ? 'home_score' : 'away_score';
    await base44.entities.Match.update(match.id, { [field]: (match[field] || 0) + 1 });
    await base44.entities.MatchEvent.create({ match_id: match.id, type: isOwn ? 'own_goal' : form.penalty ? 'penalty' : 'goal', team_id: form.team_id, player_id: form.player_id, player_name: player?.full_name, minute: form.minute, reason: form.assist ? `Assist: ${form.assist}` : '' });
    if (form.var) await base44.entities.MatchEvent.create({ match_id: match.id, type: 'var', team_id: form.team_id, player_id: form.player_id, player_name: player?.full_name, minute: form.minute, reason: 'Goal confirmed by VAR' });
    addLog(`GOAL ${player?.full_name} (${form.minute}')`, 'graphic');
    setForm({ ...form, player_id: '', assist: '', own_goal: false, penalty: false, var: false });
    await load();
  };

  const submitSub = async () => {
    if (!form.team_id || !form.player_out || !form.player_in || !form.minute) { addLog('Select team, players and minute', 'warning'); return; }
    const out = players.find((p) => p.full_name === form.player_out || p.id === form.player_out);
    const inn = players.find((p) => p.full_name === form.player_in || p.id === form.player_in);
    await base44.entities.MatchEvent.create({ match_id: match.id, type: 'substitution', team_id: form.team_id, player_id: inn?.id, player_name: `${out?.full_name} -> ${inn?.full_name}`, minute: form.minute, reason: `${out?.number}<->${inn?.number}` });
    addLog(`SUB ${out?.full_name} -> ${inn?.full_name} (${form.minute}')`, 'graphic');
    setForm({ ...form, player_out: '', player_in: '' });
    await reloadEvents();
  };

  const submitCard = async () => {
    if (!form.team_id || !form.player_id || !form.minute) { addLog('Select team, player and minute', 'warning'); return; }
    const player = players.find((p) => p.id === form.player_id);
    const type = form.card_type === 'red' ? 'red_card' : form.card_type === 'second_yellow' ? 'second_yellow' : 'yellow_card';
    const statField = form.card_type === 'red' ? 'red_cards' : 'yellow_cards';
    const teamStat = await base44.entities.Statistic.filter({ match_id: match.id, team_id: form.team_id });
    if (teamStat[0]) {
      const inc = (teamStat[0][statField] || 0) + 1;
      await base44.entities.Statistic.update(teamStat[0].id, { [statField]: inc });
    }
    await base44.entities.MatchEvent.create({ match_id: match.id, type, team_id: form.team_id, player_id: form.player_id, player_name: player?.full_name, minute: form.minute, reason: form.reason });
    addLog(`Card ${player?.full_name} (${form.minute}')`, 'graphic');
    setForm({ ...form, player_id: '', reason: '' });
    await reloadEvents();
  };

  const remove = async (e) => { await base44.entities.MatchEvent.delete(e.id); addLog('Event removed', 'warning'); await reloadEvents(); };
  const teamName = (id) => teams[id]?.short_name || '—';
  const eventIcon = { goal: Goal, own_goal: Goal, penalty: Goal, substitution: ArrowRightLeft, yellow_card: Square, second_yellow: Square, red_card: Square, var: Activity, corner: Activity, offside: Activity, injury: Activity, assist: Goal };
  const eventColor = { goal: 'text-green-400', own_goal: 'text-amber-400', penalty: 'text-blue-400', substitution: 'text-purple-400', yellow_card: 'text-yellow-400', second_yellow: 'text-orange-400', red_card: 'text-red-400', var: 'text-cyan-400', assist: 'text-green-400' };
  const teamPlayers = players.filter((p) => p.team_id === form.team_id);
  const matchTeams = match ? [teams[match.home_team_id], teams[match.away_team_id]].filter(Boolean) : [];

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      <PageHeader title="Match Events" subtitle="Goals, substitutions, disciplinary cards and live timeline" />
      {!match && <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-300">No active match. Load a match first.</div>}

      {match && (
        <>
          <div className="flex gap-2 border-b border-white/5 overflow-x-auto">
            {[{ k: 'goal', label: 'Goals', icon: Goal }, { k: 'sub', label: 'Substitutions', icon: ArrowRightLeft }, { k: 'card', label: 'Disciplinary', icon: Square }, { k: 'timeline', label: 'Timeline', icon: Clock }].map((t) => (
              <button key={t.k} onClick={() => setTab(t.k)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.k ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </div>

          {tab !== 'timeline' && (
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 max-w-2xl">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field label="Team"><Select value={form.team_id} onChange={(v) => setForm({ ...form, team_id: v, player_id: '' })} options={matchTeams} /></Field>
                <Field label="Minute"><Input type="number" value={form.minute} onChange={(v) => setForm({ ...form, minute: Number(v) })} /></Field>
                {tab === 'goal' && <>
                  <Field label="Scorer"><Select value={form.player_id} onChange={(v) => setForm({ ...form, player_id: v })} options={teamPlayers} /></Field>
                  <Field label="Assist"><Input value={form.assist} onChange={(v) => setForm({ ...form, assist: v })} /></Field>
                  <div className="flex items-end gap-4 col-span-2 sm:col-span-1 flex-wrap">
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"><input type="checkbox" checked={form.own_goal} onChange={(e) => setForm({ ...form, own_goal: e.target.checked })} className="accent-blue-500" /> Own Goal</label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"><input type="checkbox" checked={form.penalty} onChange={(e) => setForm({ ...form, penalty: e.target.checked })} className="accent-blue-500" /> Penalty</label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"><input type="checkbox" checked={form.var} onChange={(e) => setForm({ ...form, var: e.target.checked })} className="accent-blue-500" /> VAR</label>
                  </div>
                </>}
                {tab === 'sub' && <>
                  <Field label="Player Out"><Select value={form.player_out} onChange={(v) => setForm({ ...form, player_out: v })} options={teamPlayers} /></Field>
                  <Field label="Player In"><Select value={form.player_in} onChange={(v) => setForm({ ...form, player_in: v })} options={teamPlayers} /></Field>
                </>}
                {tab === 'card' && <>
                  <Field label="Player"><Select value={form.player_id} onChange={(v) => setForm({ ...form, player_id: v })} options={teamPlayers} /></Field>
                  <Field label="Card Type"><Select value={form.card_type} onChange={(v) => setForm({ ...form, card_type: v })} options={[{ id: 'yellow', name: 'Yellow' }, { id: 'second_yellow', name: 'Second Yellow' }, { id: 'red', name: 'Red' }]} /></Field>
                  <Field label="Reason"><Input value={form.reason} onChange={(v) => setForm({ ...form, reason: v })} /></Field>
                </>}
              </div>
              <button onClick={tab === 'goal' ? submitGoal : tab === 'sub' ? submitSub : submitCard} className="mt-5 flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"><Plus size={16} /> Add {tab === 'goal' ? 'Goal' : tab === 'sub' ? 'Substitution' : 'Card'}</button>
            </div>
          )}

          <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
            <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><Clock size={14} /> Match Timeline</h3>
            {events.length === 0 && <div className="text-sm text-slate-500 text-center py-6">No events recorded yet.</div>}
            <div className="relative pl-6 space-y-3">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-white/10" />
              {events.map((e) => {
                const Icon = eventIcon[e.type] || Activity;
                const colorText = eventColor[e.type] || 'text-slate-400';
                const bg = colorText.replace('text-', 'bg-');
                return (
                  <div key={e.id} className="relative flex items-center gap-3 group">
                    <div className={`absolute -left-[18px] w-3 h-3 rounded-full ${bg} ring-4 ring-[#0a0b0f]`} />
                    <Icon size={14} className={colorText} />
                    <span className="text-xs font-mono text-slate-500 w-10">{e.minute}'</span>
                    <span className="text-sm text-white capitalize flex-1">{e.type.replace(/_/g, ' ')} · {e.player_name || '—'}</span>
                    {e.reason && <span className="text-xs text-slate-500 hidden sm:inline">{e.reason}</span>}
                    <span className="text-xs text-slate-500">{teamName(e.team_id)}</span>
                    <button onClick={() => remove(e)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"><Trash2 size={13} /></button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}