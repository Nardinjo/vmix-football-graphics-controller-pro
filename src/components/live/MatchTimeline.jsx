import React from 'react';
import { Goal, Square, Ban, Repeat, Radio, Trash2, ShieldAlert, Clock } from 'lucide-react';

const STYLE = {
  goal: { icon: Goal, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  own_goal: { icon: Goal, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  penalty: { icon: Goal, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  yellow_card: { icon: Square, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  red_card: { icon: Ban, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  substitution: { icon: Repeat, color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  var: { icon: ShieldAlert, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  halftime: { icon: Clock, color: 'text-slate-300', bg: 'bg-white/5', border: 'border-white/10' },
  fulltime: { icon: Clock, color: 'text-slate-300', bg: 'bg-white/5', border: 'border-white/10' },
};

const LABELS = { goal: 'GOAL', own_goal: 'OWN GOAL', penalty: 'PENALTY GOAL', yellow_card: 'YELLOW CARD', red_card: 'RED CARD', substitution: 'SUBSTITUTION', var: 'VAR', halftime: 'HALF TIME', fulltime: 'FULL TIME' };

export default function MatchTimeline({ events, teams, onDelete }) {
  if (!events || events.length === 0) {
    return <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6 text-center text-sm text-slate-500">No events yet. Match actions will appear here in real time.</div>;
  }
  const sorted = [...events].sort((a, b) => (a.minute || 0) - (b.minute || 0) || (a.created_date || '').localeCompare(b.created_date || ''));
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-3">
      <div className="flex items-center gap-2 px-2 py-2 text-xs uppercase tracking-widest text-slate-500"><Radio size={13} /> Match Timeline ({sorted.length})</div>
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
        {sorted.map((ev) => {
          const s = STYLE[ev.type] || STYLE.var;
          const Icon = s.icon;
          const team = teams[ev.team_id];
          return (
            <div key={ev.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${s.bg} ${s.border}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.bg} border ${s.border}`}>
                <Icon size={16} className={s.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium truncate">{LABELS[ev.type] || ev.type}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  {team?.short_name ? <span style={{ color: team.primary_color }} className="font-semibold">{team.short_name} </span> : ''}
                  {ev.player_name} {ev.extra_data ? <span className="text-slate-500">· {ev.extra_data}</span> : ''}{ev.reason ? <span className="text-slate-500">· {ev.reason}</span> : ''}
                </div>
              </div>
              <div className="text-sm font-mono tabular-nums text-slate-300">{ev.minute}'</div>
              {onDelete && <button onClick={() => onDelete(ev.id)} className="text-slate-600 hover:text-red-400 p-1"><Trash2 size={14} /></button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}