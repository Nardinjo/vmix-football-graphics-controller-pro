import React, { useEffect, useState } from 'react';
import { entities as localEntities } from '@/lib/dataLayer';
import { useVmix } from '@/lib/vmixContext';
import { BarChart3, Save, RotateCcw } from 'lucide-react';
import TeamSwitcher from '@/components/live/TeamSwitcher';

const FIELDS = [
  { key: 'possession', label: 'Possession %', max: 100, suffix: '%' },
  { key: 'shots', label: 'Shots', max: 30 },
  { key: 'shots_on_target', label: 'Shots On Target', max: 20 },
  { key: 'corners', label: 'Corners', max: 20 },
  { key: 'fouls', label: 'Fouls', max: 30 },
  { key: 'offsides', label: 'Offsides', max: 20 },
  { key: 'yellow_cards', label: 'Yellow Cards', max: 10 },
  { key: 'red_cards', label: 'Red Cards', max: 5 },
  { key: 'pass_accuracy', label: 'Pass Accuracy %', max: 100, suffix: '%' },
  { key: 'expected_goals', label: 'Expected Goals (xG)', max: 10, step: 0.1 },
];

export default function Statistics() {
  const { addLog, activeMatchId } = useVmix();
  const [match, setMatch] = useState(null);
  const [teams, setTeams] = useState({});
  const [homeStat, setHomeStat] = useState(null);
  const [awayStat, setAwayStat] = useState(null);
  const [focus, setFocus] = useState('home');

  const load = async () => {
    try {
      const [matches, ts] = await Promise.all([localEntities.Match.list(), localEntities.Team.list()]);
      const map = {}; ts.forEach((t) => (map[t.id] = t)); setTeams(map);
      const m = matches.find((x) => x.is_active) || (activeMatchId ? matches.find((x) => x.id === activeMatchId) : null);
      if (!m) return;
      setMatch(m);
      setFocus('home');
      const stats = await localEntities.Statistic.filter({ match_id: m.id });
      const h = stats.find((s) => s.team_id === m.home_team_id) || await localEntities.Statistic.create({ match_id: m.id, team_id: m.home_team_id });
      const a = stats.find((s) => s.team_id === m.away_team_id) || await localEntities.Statistic.create({ match_id: m.id, team_id: m.away_team_id });
      setHomeStat(h); setAwayStat(a);
    } catch (e) {}
  };
  useEffect(() => { load(); }, [activeMatchId]);

  const update = async (side, key, value) => {
    const stat = side === 'home' ? homeStat : awayStat;
    const setStat = side === 'home' ? setHomeStat : setAwayStat;
    const updated = { ...stat, [key]: value };
    setStat(updated);
    await localEntities.Statistic.update(stat.id, { [key]: value });
  };

  const save = () => { addLog('Statistics synced to vMix', 'success'); };
  const reset = async () => {
    if (!homeStat || !awayStat) return;
    const resetFields = {};
    FIELDS.forEach((f) => (resetFields[f.key] = f.key === 'possession' ? 50 : 0));
    await Promise.all([localEntities.Statistic.update(homeStat.id, resetFields), localEntities.Statistic.update(awayStat.id, resetFields)]);
    setHomeStat({ ...homeStat, ...resetFields }); setAwayStat({ ...awayStat, ...resetFields });
    addLog('Statistics reset', 'warning');
  };

  const home = match ? teams[match.home_team_id] : null;
  const away = match ? teams[match.away_team_id] : null;

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 size={22} className="text-blue-400" /> Statistics</h1>
          <p className="text-sm text-slate-400 mt-1">Live match statistics with comparison bars</p>
        </div>
        <div className="flex items-center gap-2">
          {match && (
            <TeamSwitcher
              home={home}
              away={away}
              value={focus === 'home' ? match.home_team_id : match.away_team_id}
              onChange={(id) => setFocus(id === match.home_team_id ? 'home' : 'away')}
            />
          )}
          <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm"><RotateCcw size={16} /> Reset</button>
          <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"><Save size={16} /> Sync to vMix</button>
        </div>
      </div>

      {!match && <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-300">No active match. Load a match first.</div>}

      {match && homeStat && awayStat && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 space-y-5">
          <div className="flex items-center justify-between text-center">
            <div className={`flex-1 transition-opacity ${focus === 'home' ? '' : 'opacity-40'}`}>
              <div className="w-12 h-12 mx-auto rounded-lg flex items-center justify-center text-sm font-bold mb-1 ring-2 ring-transparent transition-all" style={{ background: home?.primary_color, color: home?.secondary_color, boxShadow: focus === 'home' ? `0 0 0 2px ${home?.primary_color || '#3b82f6'}` : 'none' }}>{home?.short_name?.slice(0,3)}</div>
              <div className="text-xs text-slate-400">{home?.name} <span className="text-[10px] text-slate-600">· HOME</span></div>
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">vs</div>
            <div className={`flex-1 transition-opacity ${focus === 'away' ? '' : 'opacity-40'}`}>
              <div className="w-12 h-12 mx-auto rounded-lg flex items-center justify-center text-sm font-bold mb-1 ring-2 ring-transparent transition-all" style={{ background: away?.primary_color, color: away?.secondary_color, boxShadow: focus === 'away' ? `0 0 0 2px ${away?.primary_color || '#ef4444'}` : 'none' }}>{away?.short_name?.slice(0,3)}</div>
              <div className="text-xs text-slate-400">{away?.name} <span className="text-[10px] text-slate-600">· AWAY</span></div>
            </div>
          </div>

          {FIELDS.map((f) => {
            const hv = homeStat[f.key] || 0;
            const av = awayStat[f.key] || 0;
            const total = hv + av || 1;
            const hp = (hv / total) * 100;
            const ap = (av / total) * 100;
            const isPossession = f.key === 'possession';
            return (
              <div key={f.key}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-white font-semibold tabular-nums w-10 text-right">{hv}{f.suffix || ''}</span>
                  <span className="text-xs text-slate-400 uppercase tracking-wider">{f.label}</span>
                  <span className="text-white font-semibold tabular-nums w-10">{av}{f.suffix || ''}</span>
                </div>
                <div className="flex items-center gap-1 h-2.5">
                  <div className="flex-1 bg-white/5 rounded-l-full overflow-hidden flex justify-end">
                    <div className="h-full rounded-l-full transition-all duration-500" style={{ width: `${hp}%`, background: home?.primary_color || '#3b82f6' }} />
                  </div>
                  <div className="w-px h-full bg-white/20" />
                  <div className="flex-1 bg-white/5 rounded-r-full overflow-hidden">
                    <div className="h-full rounded-r-full transition-all duration-500" style={{ width: `${ap}%`, background: away?.primary_color || '#ef4444' }} />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className={`flex items-center gap-1 transition-opacity ${focus === 'home' ? '' : 'opacity-40'}`}>
                    <button onClick={() => update('home', f.key, Math.max(0, hv - (f.step || 1)))} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm">-</button>
                    <input type="number" step={f.step || 1} value={hv} onChange={(e) => update('home', f.key, Number(e.target.value))} className="w-16 px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-xs text-white text-center outline-none focus:border-blue-500" />
                    <button onClick={() => update('home', f.key, hv + (f.step || 1))} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm">+</button>
                  </div>
                  <div className="w-8" />
                  <div className={`flex items-center gap-1 transition-opacity ${focus === 'away' ? '' : 'opacity-40'}`}>
                    <button onClick={() => update('away', f.key, Math.max(0, av - (f.step || 1)))} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm">-</button>
                    <input type="number" step={f.step || 1} value={av} onChange={(e) => update('away', f.key, Number(e.target.value))} className="w-16 px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-xs text-white text-center outline-none focus:border-blue-500" />
                    <button onClick={() => update('away', f.key, av + (f.step || 1))} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm">+</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}