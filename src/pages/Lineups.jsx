import React, { useEffect, useState } from 'react';
import { entities as localEntities } from '@/lib/dataLayer';
import { useVmix } from '@/lib/vmixContext';
import { Grid3x3, Save, Shuffle, Users } from 'lucide-react';
import { Select } from '@/pages/Matches';
import TeamSwitcher from '@/components/live/TeamSwitcher';

const FORMATIONS = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2', '3-4-3'];

export default function Lineups() {
  const { addLog, activeMatchId } = useVmix();
  const [match, setMatch] = useState(null);
  const [teams, setTeams] = useState({});
  const [players, setPlayers] = useState([]);
  const [formation, setFormation] = useState('4-3-3');
  // Per-team lineup state so the team dropdown genuinely swaps rosters/XI.
  const [lineups, setLineups] = useState({}); // { [teamId]: { starting: [], subs: [] } }
  const [teamId, setTeamId] = useState(null);
  const current = lineups[teamId] || { starting: [], subs: [] };
  const starting = current.starting;
  const subs = current.subs;

  const load = async () => {
    try {
      const [matches, ts, ps] = await Promise.all([localEntities.Match.list(), localEntities.Team.list(), localEntities.Player.list()]);
      const map = {}; ts.forEach((t) => (map[t.id] = t)); setTeams(map);
      const m = matches.find((x) => x.is_active) || (activeMatchId ? matches.find((x) => x.id === activeMatchId) : null);
      if (!m) return;
      setMatch(m);
      setPlayers(ps);
      setTeamId(m.home_team_id);
    } catch (e) {}
  };
  useEffect(() => { load(); }, [activeMatchId]);

  const setTeamLineup = (updater) => setLineups((prev) => {
    const cur = prev[teamId] || { starting: [], subs: [] };
    return { ...prev, [teamId]: updater(cur) };
  });
  const toggleStarting = (p) => {
    setTeamLineup((cur) => {
      if (cur.starting.find((s) => s.id === p.id)) return { ...cur, starting: cur.starting.filter((s) => s.id !== p.id) };
      if (cur.starting.length >= 11) return cur;
      return { ...cur, starting: [...cur.starting, p] };
    });
  };
  const toggleSub = (p) => {
    setTeamLineup((cur) => {
      if (cur.subs.find((s) => s.id === p.id)) return { ...cur, subs: cur.subs.filter((s) => s.id !== p.id) };
      return { ...cur, subs: [...cur.subs, p] };
    });
  };

  const autoSort = () => {
    setTeamLineup((cur) => ({ ...cur, starting: [...cur.starting].sort((a, b) => {
      const order = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
      return order[a.position] - order[b.position];
    }) }));
    addLog('Lineup auto-sorted by position', 'success');
  };

  const home = match ? teams[match.home_team_id] : null;
  const away = match ? teams[match.away_team_id] : null;
  const selectedTeam = match ? teams[teamId] : null;
  const teamPlayers = players.filter((p) => p.team_id === teamId);

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Grid3x3 size={22} className="text-blue-400" /> Lineups</h1>
          <p className="text-sm text-slate-400 mt-1">Build starting XI and substitutes with drag-friendly selection</p>
        </div>
        <div className="flex gap-2">
          <button onClick={autoSort} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm"><Shuffle size={16} /> Auto Sort</button>
          <button onClick={() => addLog('Lineup saved as template', 'success')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"><Save size={16} /> Save Template</button>
        </div>
      </div>

      {!match && <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-300">No active match. Load a match first.</div>}

      {match && (
        <>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: selectedTeam?.primary_color, color: selectedTeam?.secondary_color }}>{selectedTeam?.short_name?.slice(0,3)}</div>
              <span className="text-white font-medium">{selectedTeam?.name}</span>
            </div>
            <TeamSwitcher home={home} away={away} value={teamId} onChange={setTeamId} />
            <div className="w-40">
              <Select value={formation} onChange={setFormation} options={FORMATIONS.map((f) => ({ id: f, name: f }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Pitch */}
            <div className="lg:col-span-2 rounded-2xl bg-gradient-to-b from-green-900/40 to-green-950/40 border border-green-500/20 p-6 relative min-h-[480px]">
              <div className="absolute inset-4 border-2 border-white/20 rounded-xl" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/20 rounded-full" />
              <div className="absolute left-0 right-0 top-1/2 h-px bg-white/20" />
              <div className="relative h-full flex flex-col justify-between py-8">
                <PlayerSlot player={starting[0]} label="GK" />
                <div className="flex justify-around">
                  {Array.from({ length: parseInt(formation.split('-')[0]) }).map((_, i) => <PlayerSlot key={i} player={starting[1 + i]} />)}
                </div>
                <div className="flex justify-around">
                  {Array.from({ length: parseInt(formation.split('-')[1]) }).map((_, i) => <PlayerSlot key={i} player={starting[1 + parseInt(formation.split('-')[0]) + i]} />)}
                </div>
                <div className="flex justify-around">
                  {Array.from({ length: parseInt(formation.split('-')[2]) }).map((_, i) => <PlayerSlot key={i} player={starting[starting.length - 1 - i]} />)}
                </div>
              </div>
            </div>

            {/* Player pool */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 max-h-[520px] overflow-y-auto">
              <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2"><Users size={14} /> Squad ({teamPlayers.length})</h3>
              <div className="space-y-1.5">
                {teamPlayers.map((p) => {
                  const inXI = starting.find((s) => s.id === p.id);
                  const inSubs = subs.find((s) => s.id === p.id);
                  return (
                    <div key={p.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm ${inXI ? 'bg-blue-600/20 border border-blue-500/30' : inSubs ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/5 hover:bg-white/10'}`}>
                      <span className="w-7 h-7 rounded-lg bg-black/40 flex items-center justify-center text-xs font-bold text-white">{p.number}</span>
                      <span className="flex-1 text-slate-200 truncate">{p.full_name}</span>
                      <span className="text-[10px] text-slate-500">{p.position}</span>
                      <button onClick={() => toggleStarting(p)} className={`w-7 h-7 rounded text-xs ${inXI ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400 hover:bg-blue-600 hover:text-white'}`}>XI</button>
                      <button onClick={() => toggleSub(p)} className={`w-7 h-7 rounded text-xs ${inSubs ? 'bg-amber-500 text-black' : 'bg-white/10 text-slate-400 hover:bg-amber-500 hover:text-black'}`}>S</button>
                    </div>
                  );
                })}
                {teamPlayers.length === 0 && <div className="text-xs text-slate-500 text-center py-4">No players for this team.</div>}
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 text-xs text-slate-500">Starting XI: {starting.length}/11 · Subs: {subs.length}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PlayerSlot({ player, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold border-2 ${player ? 'bg-blue-600 border-white text-white' : 'bg-white/5 border-dashed border-white/30 text-slate-600'}`}>
        {player ? player.number : '?'}
      </div>
      <span className="text-[10px] text-white/80 max-w-[70px] truncate text-center">{player ? player.short_name || player.full_name : label || '—'}</span>
    </div>
  );
}