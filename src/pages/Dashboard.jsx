import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { entities as localEntities } from '@/lib/dataLayer';
import { useVmix } from '@/lib/vmixContext';
import { Radio, Trophy, Activity, Clock, Users, MonitorPlay, ArrowRight, Zap } from 'lucide-react';

export default function Dashboard() {
  const { connected, clock, operatorName, log, activeMatchId } = useVmix();
  const [match, setMatch] = useState(null);
  const [teams, setTeams] = useState({});
  const [stats, setStats] = useState({ matches: 0, teams: 0, players: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [matches, teamsList, players] = await Promise.all([
          localEntities.Match.list(),
          localEntities.Team.list(),
          localEntities.Player.list(),
        ]);
        setStats({ matches: matches.length, teams: teamsList.length, players: players.length });
        const tMap = {};
        teamsList.forEach((t) => (tMap[t.id] = t));
        setTeams(tMap);
        const active = matches.find((m) => m.is_active) || (activeMatchId ? matches.find((m) => m.id === activeMatchId) : null);
        if (active) setMatch(active);
      } catch (e) {}
    })();
  }, [activeMatchId]);

  const home = match ? teams[match.home_team_id] : null;
  const away = match ? teams[match.away_team_id] : null;

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Hero status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 rounded-2xl p-6 border ${connected ? 'bg-gradient-to-br from-green-500/10 to-emerald-600/5 border-green-500/20' : 'bg-gradient-to-br from-red-500/10 to-rose-600/5 border-red-500/20'}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400 mb-2">
                <Radio size={14} className={connected ? 'text-green-400' : 'text-red-400'} /> Broadcast Status
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-4xl font-bold ${connected ? 'text-green-400' : 'text-red-400'}`}>{connected ? 'LIVE' : 'OFFLINE'}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-mono ${connected ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{connected ? 'PROGRAM' : 'STANDBY'}</span>
              </div>
              <div className="text-slate-400 text-sm mt-2">Operator: <span className="text-white font-medium">{operatorName}</span></div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono tabular-nums text-white">{clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
              <div className="text-xs text-slate-500 mt-1">{clock.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6 bg-white/[0.03] border border-white/5">
          <div className="text-xs uppercase tracking-widest text-slate-400 mb-3">Quick Stats</div>
          <div className="space-y-3">
            <StatRow icon={Trophy} label="Matches" value={stats.matches} color="text-blue-400" />
            <StatRow icon={Users} label="Teams" value={stats.teams} color="text-purple-400" />
            <StatRow icon={Activity} label="Players" value={stats.players} color="text-amber-400" />
          </div>
        </div>
      </div>

      {/* Current match */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><Trophy size={16} className="text-blue-400" /> Current Match</div>
          <Link to="/matches" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">Manage <ArrowRight size={12} /></Link>
        </div>
        {match ? (
          <div className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 text-center">
                <div className="w-16 h-16 mx-auto rounded-xl bg-white/5 flex items-center justify-center text-2xl font-bold mb-2" style={{ background: home?.primary_color || '#1e3a8a', color: home?.secondary_color || '#fff' }}>
                  {home?.short_name?.slice(0, 3) || 'HOM'}
                </div>
                <div className="text-white font-medium text-sm">{home?.name || 'Home Team'}</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-white tabular-nums">{match.home_score} <span className="text-slate-600">:</span> {match.away_score}</div>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">
                  {match.status === 'live' ? <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE · {match.current_minute}'</> : match.status === 'halftime' ? 'HALF TIME' : match.status === 'finished' ? 'FULL TIME' : 'SCHEDULED'}
                </div>
                <div className="text-xs text-slate-500 mt-2">{match.competition} · {match.venue}</div>
              </div>
              <div className="flex-1 text-center">
                <div className="w-16 h-16 mx-auto rounded-xl bg-white/5 flex items-center justify-center text-2xl font-bold mb-2" style={{ background: away?.primary_color || '#9a1a1a', color: away?.secondary_color || '#fff' }}>
                  {away?.short_name?.slice(0, 3) || 'AWY'}
                </div>
                <div className="text-white font-medium text-sm">{away?.name || 'Away Team'}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-10 text-center text-slate-500 text-sm">
            No active match. <Link to="/matches" className="text-blue-400 hover:underline">Load a match</Link> to begin.
          </div>
        )}
      </div>

      {/* Quick actions + log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-white mb-4"><Zap size={16} className="text-amber-400" /> Quick Graphics</div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {['Score Bug', 'Lower Third', 'Goal', 'Substitution', 'Yellow Card', 'Red Card', 'Statistics', 'Lineups'].map((g) => (
              <Link key={g} to="/graphics" className="px-3 py-3 rounded-xl bg-white/5 hover:bg-blue-600 hover:text-white text-slate-300 text-xs font-medium text-center transition-all border border-white/5 hover:border-blue-500">
                {g}
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-white mb-4"><Clock size={16} className="text-slate-400" /> Recent Actions</div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {log.length === 0 && <div className="text-xs text-slate-600">No recent actions</div>}
            {log.slice(0, 8).map((l) => (
              <div key={l.id} className="text-xs flex items-start gap-2">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${l.type === 'success' ? 'bg-green-500' : l.type === 'warning' ? 'bg-amber-500' : l.type === 'graphic' ? 'bg-blue-500' : 'bg-slate-500'}`} />
                <div>
                  <div className="text-slate-300">{l.message}</div>
                  <div className="text-slate-600 font-mono">{new Date(l.time).toLocaleTimeString('en-GB')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-slate-400"><Icon size={16} className={color} /> {label}</div>
      <span className="text-white font-semibold tabular-nums">{value}</span>
    </div>
  );
}