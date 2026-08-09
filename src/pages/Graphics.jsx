import React, { useEffect, useState } from 'react';
import { useVmix } from '@/lib/vmixContext';
import { MonitorPlay, Eye, EyeOff, Zap } from 'lucide-react';

const GROUPS = [
  { title: 'Match Info', items: ['Match Intro', 'Competition', 'Venue', 'Officials', 'Formation Graphic', 'Full Screen'] },
  { title: 'Lineups & Players', items: ['Team Lineup', 'Player Profile', 'Starting XI', 'Substitutes', 'Coach'] },
  { title: 'Live Graphics', items: ['Score Bug', 'Lower Third', 'Player Name', 'Added Time', 'Half Time', 'Full Time'] },
  { title: 'Goals & Cards', items: ['Goal Scorer', 'Goal Replay', 'Assist', 'Own Goal', 'Penalty', 'Yellow Card', 'Red Card', 'VAR Review'] },
  { title: 'Match Events', items: ['Substitution', 'Man of the Match', 'Breaking News', 'Sponsor', 'Ticker'] },
  { title: 'Statistics', items: ['Statistics', 'Possession', 'Shots', 'Corners', 'Cards', 'Offside'] },
];

export default function Graphics() {
  const { triggerGraphic, connected } = useVmix();
  const [last, setLast] = useState(null);

  const fire = (g) => { triggerGraphic(g); setLast(g); };

  useEffect(() => {
    const handler = (e) => {
      const map = { F1: 'Match Intro', F2: 'Team Lineup', F3: 'Score Bug', F4: 'Goal Scorer', F5: 'Substitution', F6: 'Yellow Card', F7: 'Red Card', F8: 'Statistics', F9: 'Hide Graphic', F10: 'Hide All' };
      if (map[e.key]) { e.preventDefault(); fire(map[e.key]); }
      if (e.code === 'Space') { e.preventDefault(); fire('Next Graphic'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><MonitorPlay size={22} className="text-blue-400" /> Graphics Control</h1>
          <p className="text-sm text-slate-400 mt-1">Trigger broadcast graphics with a single click · F1–F10 shortcuts active</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fire('Hide Graphic')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium"><EyeOff size={16} /> Hide (F9)</button>
          <button onClick={() => fire('Hide All')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium border border-red-500/20"><EyeOff size={16} /> Hide All (F10)</button>
        </div>
      </div>

      {!connected && <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-300">vMix is not connected. Graphics will be queued but not sent. Connect in Settings.</div>}

      {last && (
        <div className="rounded-xl bg-blue-600/10 border border-blue-500/20 px-4 py-3 text-sm text-blue-300 flex items-center gap-2"><Zap size={15} /> Last triggered: <span className="font-semibold text-white">{last}</span></div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {GROUPS.map((g) => (
          <div key={g.title} className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
            <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-3">{g.title}</h3>
            <div className="grid grid-cols-2 gap-2">
              {g.items.map((item) => (
                <button key={item} onClick={() => fire(item)}
                  className="flex items-center gap-2 px-3 py-3 rounded-xl bg-white/5 hover:bg-blue-600 text-slate-300 hover:text-white text-sm font-medium transition-all border border-white/5 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-600/20 active:scale-95">
                  <Eye size={14} className="opacity-60" /> {item}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}