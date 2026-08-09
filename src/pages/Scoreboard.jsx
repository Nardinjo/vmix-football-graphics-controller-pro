import React, { useEffect, useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useVmix } from '@/lib/vmixContext';
import { Play, Pause, RotateCcw, Plus, Minus, Clock, Radio, Save } from 'lucide-react';

export default function Scoreboard() {
  const { connected, addLog, activeMatchId } = useVmix();
  const [match, setMatch] = useState(null);
  const [teams, setTeams] = useState({});
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [half, setHalf] = useState(1);
  const [extra, setExtra] = useState(0);
  const [customMin, setCustomMin] = useState('');
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [matches, ts] = await Promise.all([base44.entities.Match.list(), base44.entities.Team.list()]);
      const m = matches.find((x) => x.is_active) || (activeMatchId ? matches.find((x) => x.id === activeMatchId) : null);
      const map = {}; ts.forEach((t) => (map[t.id] = t)); setTeams(map);
      if (m) { setMatch(m); setSeconds((m.current_minute || 0) * 60); setHalf(m.current_half || 1); }
    } catch (e) {}
  }, [activeMatchId]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      return () => clearInterval(intervalRef.current);
    }
  }, [running]);

  const persist = useCallback(async (overrides = {}) => {
    if (!match) return;
    const minute = Math.floor(seconds / 60);
    await base44.entities.Match.update(match.id, { current_minute: minute, current_half: half, ...overrides });
  }, [match, seconds, half]);

  const start = () => { setRunning(true); addLog('Timer started', 'success'); };
  const pause = () => { setRunning(false); addLog('Timer paused', 'warning'); };
  const reset = async () => { setRunning(false); setSeconds(0); setExtra(0); await persist({ current_minute: 0, home_score: match.home_score, away_score: match.away_score }); addLog('Timer reset', 'warning'); };
  const addMin = (n) => setSeconds((s) => Math.max(0, s + n * 60));
  const setCustom = () => { const m = parseInt(customMin); if (!isNaN(m)) { setSeconds(m * 60); setCustomMin(''); addLog(`Time set to ${m}'`, 'info'); } };

  const home = match ? teams[match.home_team_id] : null;
  const away = match ? teams[match.away_team_id] : null;
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const displayMin = Math.floor(seconds / 60);

  const updateScore = async (side, delta) => {
    if (!match) return;
    const field = side === 'home' ? 'home_score' : 'away_score';
    const val = Math.max(0, (match[field] || 0) + delta);
    setMatch({ ...match, [field]: val });
    await base44.entities.Match.update(match.id, { [field]: val });
    addLog(`${side === 'home' ? home?.name : away?.name} ${delta > 0 ? 'goal' : 'goal removed'} → ${val}`, 'graphic');
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Radio size={22} className="text-blue-400" /> Scoreboard</h1>
        <p className="text-sm text-slate-400 mt-1">Professional broadcast scoreboard with live timer controls</p>
      </div>

      {/* Scoreboard display */}
      <div className="rounded-2xl bg-gradient-to-b from-[#0d0f14] to-black border border-white/10 overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-5 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white text-xs font-semibold uppercase tracking-wider">
            {running ? <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE</> : <><Pause size={12} /> Paused</>}
          </div>
          <div className="text-white/80 text-xs font-medium">{match?.competition || 'Match'}</div>
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold mb-3" style={{ background: home?.primary_color || '#1e3a8a', color: home?.secondary_color || '#fff' }}>{home?.short_name?.slice(0,3) || 'HOM'}</div>
              <div className="text-white font-medium text-sm sm:text-base truncate">{home?.name || 'Home'}</div>
            </div>
            <div className="text-center px-4">
              <div className="text-6xl sm:text-7xl font-bold text-white tabular-nums">{match?.home_score ?? 0} <span className="text-slate-700">:</span> {match?.away_score ?? 0}</div>
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                <Clock size={14} className="text-blue-400" />
                <span className="text-2xl font-mono tabular-nums text-white">{mm}:{ss}</span>
              </div>
              <div className="text-xs text-slate-500 mt-2">{half === 1 ? '1st Half' : half === 2 ? '2nd Half' : 'Extra Time'} {extra > 0 && `+${extra}`}</div>
            </div>
            <div className="flex-1 text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold mb-3" style={{ background: away?.primary_color || '#9a1a1a', color: away?.secondary_color || '#fff' }}>{away?.short_name?.slice(0,3) || 'AWY'}</div>
              <div className="text-white font-medium text-sm sm:text-base truncate">{away?.name || 'Away'}</div>
            </div>
          </div>
        </div>
      </div>

      {!match && <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-300">No active match. Load a match from the Matches page.</div>}

      {/* Timer controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
          <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-4">Timer Controls</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {!running ? (
              <button onClick={start} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-medium"><Play size={16} /> Start</button>
            ) : (
              <button onClick={pause} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium"><Pause size={16} /> Pause</button>
            )}
            <button onClick={reset} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium"><RotateCcw size={16} /> Reset</button>
            <button onClick={() => addMin(1)} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium"><Plus size={16} /> +1 Min</button>
            <button onClick={() => addMin(-1)} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium"><Minus size={16} /> -1 Min</button>
            <button onClick={() => setExtra((e) => e + 1)} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-sm font-medium">+Stoppage</button>
            <button onClick={() => setExtra((e) => Math.max(0, e - 1))} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium">-Stoppage</button>
            <div className="flex gap-1 col-span-2 sm:col-span-1">
              <input type="number" value={customMin} onChange={(e) => setCustomMin(e.target.value)} placeholder="Min" className="w-full px-3 py-3 rounded-xl bg-black/30 border border-white/10 text-sm text-white outline-none focus:border-blue-500" />
              <button onClick={setCustom} className="px-3 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"><Save size={16} /></button>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map((h) => (
              <button key={h} onClick={() => setHalf(h)} className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium ${half === h ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>{h === 3 ? 'Extra' : `${h}st Half`}</button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
          <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-4">Score Controls</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/5 p-4 text-center">
              <div className="text-xs text-slate-400 mb-2">{home?.name || 'Home'}</div>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => updateScore('home', -1)} className="w-10 h-10 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-lg font-bold">-</button>
                <span className="text-3xl font-bold text-white tabular-nums w-10">{match?.home_score ?? 0}</span>
                <button onClick={() => updateScore('home', 1)} className="w-10 h-10 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-lg font-bold">+</button>
              </div>
            </div>
            <div className="rounded-xl bg-white/5 p-4 text-center">
              <div className="text-xs text-slate-400 mb-2">{away?.name || 'Away'}</div>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => updateScore('away', -1)} className="w-10 h-10 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-lg font-bold">-</button>
                <span className="text-3xl font-bold text-white tabular-nums w-10">{match?.away_score ?? 0}</span>
                <button onClick={() => updateScore('away', 1)} className="w-10 h-10 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-lg font-bold">+</button>
              </div>
            </div>
          </div>
          <button onClick={() => persist()} className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"><Save size={16} /> Sync to vMix</button>
          <div className="text-xs text-slate-500 mt-2 text-center">Current minute: <span className="text-white font-mono">{displayMin}'</span> {extra > 0 && <span className="text-amber-400">+{extra}</span>}</div>
        </div>
      </div>
    </div>
  );
}