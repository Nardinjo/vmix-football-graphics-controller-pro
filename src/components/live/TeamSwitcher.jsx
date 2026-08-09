import React from 'react';
import { ChevronDown } from 'lucide-react';

// Professional Home/Away selector shared by Lineups and Statistics.
// Native <select> under the hood so it stays reliable (no remount/focus bugs).
export default function TeamSwitcher({ home, away, value, onChange, disabled }) {
  const teams = [home ? { ...home, side: 'Home' } : null, away ? { ...away, side: 'Away' } : null].filter(Boolean);
  const current = teams.find((t) => t.id === value) || teams[0];

  return (
    <div className="relative inline-flex items-center">
      {current && (
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-md pointer-events-none border border-white/20" style={{ background: current.primary_color }} />
      )}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || teams.length === 0}
        className="w-56 pl-9 pr-9 py-2.5 rounded-lg bg-black/40 border border-white/10 text-sm text-white outline-none focus:border-blue-500 transition-colors appearance-none disabled:opacity-40"
      >
        {teams.length === 0 && <option value="">No match</option>}
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.side} · {t.name}
          </option>
        ))}
      </select>
      <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}