import React, { useState, useEffect, useRef, useCallback } from 'react';
import { entities as localEntities } from '@/lib/dataLayer';
import { useVmix } from '@/lib/vmixContext';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import ActionModal from '@/components/live/ActionModal';
import MatchTimeline from '@/components/live/MatchTimeline';
import { Link } from 'react-router-dom';
import {
  Trophy, Goal, Square, Ban, Repeat, User, Radio, ShieldAlert, Clock, Wifi, WifiOff,
  Database, Check, X, Play, Pause, RotateCcw, Plus, Minus, LayoutGrid, BarChart3, Eraser, Flag, FlagTriangleRight, AlertCircle
} from 'lucide-react';

export default function LiveMatch() {
  const vmix = useVmix();
  const { connected, connecting, connect, operatorName, activeMatchId, shortcuts, sendGraphicData, takeGraphic, clearAllGraphics, addLog } = vmix;
  const online = useNetworkStatus();

  const [match, setMatch] = useState(null);
  const [home, setHome] = useState(null);
  const [away, setAway] = useState(null);
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [teamsMap, setTeamsMap] = useState({});
  const [events, setEvents] = useState([]);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [half, setHalf] = useState(1);
  const [extra, setExtra] = useState(0);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const intervalRef = useRef(null);
  const handlersRef = useRef({});

  const minute = Math.max(0, Math.floor(seconds / 60));
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const load = useCallback(async () => {
    try {
      const matches = await localEntities.Match.list();
      const m = matches.find((x) => x.is_active) || (activeMatchId ? matches.find((x) => x.id === activeMatchId) : null) || matches[0];
      if (!m) { setMatch(null); return; }
      setMatch(m); setHalf(m.current_half || 1); setSeconds((m.current_minute || 0) * 60);
      const [ts, pls, evs] = await Promise.all([localEntities.Team.list(), localEntities.Player.list(), localEntities.MatchEvent.filter({ match_id: m.id })]);
      const tmap = {}; ts.forEach((t) => (tmap[t.id] = t)); setTeamsMap(tmap);
      setHome(tmap[m.home_team_id] || null); setAway(tmap[m.away_team_id] || null);
      setHomePlayers(pls.filter((p) => p.team_id === m.home_team_id).sort((a, b) => (a.number || 99) - (b.number || 99)));
      setAwayPlayers(pls.filter((p) => p.team_id === m.away_team_id).sort((a, b) => (a.number || 99) - (b.number || 99)));
      setEvents(evs);
    } catch (e) { /* empty */ }
  }, [activeMatchId]);

  useEffect(() => { load(); }, [load]);

  // Clock
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      return () => clearInterval(intervalRef.current);
    }
  }, [running]);

  const persistClock = useCallback(async (minuteOnly = false) => {
    if (!match) return;
    setSaving(true);
    try {
      await localEntities.Match.update(match.id, { current_minute: minute, current_half: half });
      setSaving(false);
    } catch (e) { setSaving(false); }
  }, [match, minute, half, extra]);

  const toggleClock = useCallback(() => {
    setRunning((r) => {
      if (r) addLog('Clock paused', 'info');
      else addLog('Clock started', 'success');
      return !r;
    });
  }, [addLog]);

  const resetClock = useCallback(() => {
    setRunning(false); setSeconds(0); setExtra(0);
    if (match) localEntities.Match.update(match.id, { current_minute: 0, current_half: half });
    addLog('Clock reset', 'warning');
  }, [match, half, addLog]);

  // Bump a statistic field for a team in this match.
  const bumpStat = useCallback(async (teamId, key, delta) => {
    if (!match || !teamId) return;
    try {
      const stats = await localEntities.Statistic.filter({ match_id: match.id, team_id: teamId });
      let rec = stats[0];
      if (!rec) rec = await localEntities.Statistic.create({ match_id: match.id, team_id: teamId });
      await localEntities.Statistic.update(rec.id, { [key]: (rec[key] || 0) + delta });
    } catch (e) { /* empty */ }
  }, [match]);

  const getPlayers = (side) => (side === 'home' ? homePlayers : awayPlayers);
  const teamOf = (side) => (side === 'home' ? home : away);

  const openAction = useCallback((type, side = 'home') => setModal({ id: Date.now(), type, side }), []);

  // TAKE dispatcher
  const onTake = useCallback((p) => {
    switch (p.type) {
      case 'goal': return takeGoal(p);
      case 'yellow': return takeYellow(p);
      case 'red': return takeRed(p);
      case 'sub': return takeSub(p);
      case 'lowerthird': return takeLowerThird(p);
      case 'coach': return takeCoach(p);
      case 'var': return takeVar(p);
    }
  }, [match, home, away, homePlayers, awayPlayers, half, minute]);

  const onPreview = useCallback((p) => {
    if (p.type === 'lowerthird') previewLowerThird(p);
  }, [home, away, homePlayers, awayPlayers]);

  const onOut = useCallback(() => {
    vmix.outGraphic('Player Lower Third');
    addLog('Lower third OUT', 'graphic');
    setModal(null);
  }, [vmix, addLog]);

  const playerById = (side, id) => getPlayers(side).find((p) => p.id === id);

  async function takeGoal(p) {
    const team = teamOf(p.side);
    const scorer = playerById(p.side, p.scorerId);
    const assist = p.assistId ? playerById(p.side, p.assistId) : null;
    const field = p.side === 'home' ? 'home_score' : 'away_score';
    const ns = (match[field] || 0) + 1;
    const next = { ...match, [field]: ns };
    setMatch(next);
    setModal(null);
    try {
      await localEntities.Match.update(match.id, { [field]: ns, current_minute: p.minute, current_half: half });
      await localEntities.MatchEvent.create({ match_id: match.id, type: p.goalType === 'Own Goal' ? 'own_goal' : 'goal', team_id: team?.id, player_id: scorer?.id, player_name: scorer?.full_name, minute: p.minute, reason: p.goalType, extra_data: assist ? `Assist: ${assist.full_name}` : '' });
      if (p.isVar) await localEntities.MatchEvent.create({ match_id: match.id, type: 'var', team_id: team?.id, minute: p.minute, reason: 'Goal confirmed' });
      bumpStat(team?.id, 'shots_on_target', 1);
      sendGraphicData('Goal', { PLAYER_NAME: scorer?.full_name || '', PLAYER_NUMBER: scorer?.number ?? '', TEAM_NAME: team?.name || '', TEAM_SHORT: team?.short_name || '', MINUTE: p.minute, ASSIST: assist?.full_name || '', GOAL_TYPE: p.goalType });
      takeGraphic('Goal');
      addLog(`GOAL · ${p.side.toUpperCase()} · ${scorer?.full_name} (${p.minute}')`, 'success');
      setEvents(await localEntities.MatchEvent.filter({ match_id: match.id }));
    } catch (e) { addLog('Goal save failed', 'warning'); }
  }

  async function takeYellow(p) {
    const team = teamOf(p.side);
    const pl = playerById(p.side, p.playerId);
    setModal(null);
    try {
      await localEntities.Match.update(match.id, { current_minute: p.minute, current_half: half });
      await localEntities.MatchEvent.create({ match_id: match.id, type: 'yellow_card', team_id: team?.id, player_id: pl?.id, player_name: pl?.full_name, minute: p.minute });
      bumpStat(team?.id, 'yellow_cards', 1);
      sendGraphicData('Yellow Card', { PLAYER_NAME: pl?.full_name || '', PLAYER_NUMBER: pl?.number ?? '', TEAM_NAME: team?.name || '', MINUTE: p.minute });
      takeGraphic('Yellow Card');
      addLog(`YELLOW · ${p.side.toUpperCase()} · ${pl?.full_name} (${p.minute}')`, 'warning');
      setEvents(await localEntities.MatchEvent.filter({ match_id: match.id }));
    } catch (e) { addLog('Yellow card save failed', 'warning'); }
  }

  async function takeRed(p) {
    const team = teamOf(p.side);
    const pl = playerById(p.side, p.playerId);
    setModal(null);
    try {
      await localEntities.Match.update(match.id, { current_minute: p.minute, current_half: half });
      await localEntities.MatchEvent.create({ match_id: match.id, type: 'red_card', team_id: team?.id, player_id: pl?.id, player_name: pl?.full_name, minute: p.minute, reason: p.reason });
      bumpStat(team?.id, 'red_cards', 1);
      sendGraphicData('Red Card', { PLAYER_NAME: pl?.full_name || '', PLAYER_NUMBER: pl?.number ?? '', TEAM_NAME: team?.name || '', MINUTE: p.minute, REASON: p.reason || '' });
      takeGraphic('Red Card');
      addLog(`RED · ${p.side.toUpperCase()} · ${pl?.full_name} (${p.minute}')`, 'warning');
      setEvents(await localEntities.MatchEvent.filter({ match_id: match.id }));
    } catch (e) { addLog('Red card save failed', 'warning'); }
  }

  async function takeSub(p) {
    const team = teamOf(p.side);
    const out = playerById(p.side, p.outId);
    const inn = playerById(p.side, p.inId);
    setModal(null);
    try {
      await localEntities.Match.update(match.id, { current_minute: p.minute, current_half: half });
      await localEntities.MatchEvent.create({ match_id: match.id, type: 'substitution', team_id: team?.id, minute: p.minute, player_name: `${out?.full_name} ➡ ${inn?.full_name}`, extra_data: `#${out?.number ?? ''} OUT /#${inn?.number ?? ''} IN` });
      sendGraphicData('Substitution', { PLAYER_OUT_NAME: out?.full_name || '', PLAYER_OUT_NUMBER: out?.number ?? '', PLAYER_IN_NAME: inn?.full_name || '', PLAYER_IN_NUMBER: inn?.number ?? '', TEAM_NAME: team?.name || '', MINUTE: p.minute });
      takeGraphic('Substitution');
      addLog(`SUB · ${p.side.toUpperCase()} · #${out?.number} ➡ #${inn?.number} (${p.minute}')`, 'success');
      setEvents(await localEntities.MatchEvent.filter({ match_id: match.id }));
    } catch (e) { addLog('Substitution save failed', 'warning'); }
  }

  async function previewLowerThird(p) {
    const team = teamOf(p.side);
    const pl = playerById(p.side, p.playerId);
    sendGraphicData('Player Lower Third', { PLAYER_NAME: pl?.full_name || '', PLAYER_NUMBER: pl?.number ?? '', SHORT_NAME: pl?.short_name || '', POSITION: pl?.position || '', TEAM_NAME: team?.name || '', TEAM_SHORT: team?.short_name || '', TEAM_LOGO: team?.logo_url || '', PLAYER_PHOTO: pl?.photo_url || '' });
    addLog(`Lower third preview · ${pl?.full_name}`, 'graphic');
  }

  async function takeLowerThird(p) {
    previewLowerThird(p);
    takeGraphic('Player Lower Third');
    addLog(`Lower third TAKE · ${p.side.toUpperCase()}`, 'success');
    setModal(null);
  }

  async function takeCoach(p) {
    const team = teamOf(p.side);
    setModal(null);
    sendGraphicData('Coach', { COACH_NAME: team?.coach || '', COACH_NATIONALITY: team?.country || '', COACH_ROLE: 'Head Coach', TEAM_NAME: team?.name || '', TEAM_LOGO: team?.logo_url || '' });
    takeGraphic('Coach');
    addLog(`Coach graphic · ${p.side.toUpperCase()} · ${team?.coach || ''}`, 'success');
  }

  async function takeVar(p) {
    const team = teamOf(p.side);
    setModal(null);
    try {
      await localEntities.MatchEvent.create({ match_id: match.id, type: 'var', team_id: team?.id, minute: p.minute, reason: `${p.status}${p.reason ? ' — ' + p.reason : ''}` });
      sendGraphicData('VAR', { VAR_STATUS: p.status || '', REASON: p.reason || '', MINUTE: p.minute, TEAM_NAME: team?.name || '' });
      takeGraphic('VAR');
      addLog(`VAR · ${p.status} · ${p.side.toUpperCase()} (${p.minute}')`, 'warning');
      setEvents(await localEntities.MatchEvent.filter({ match_id: match.id }));
    } catch (e) { addLog('VAR save failed', 'warning'); }
  }

  async function takeStats() {
    try {
      const stats = await localEntities.Statistic.filter({ match_id: match.id });
      const gh = stats.find((s) => s.team_id === match.home_team_id) || {};
      const ga = stats.find((s) => s.team_id === match.away_team_id) || {};
      sendGraphicData('Statistics', { HOME_POSSESSION: gh.possession ?? 50, AWAY_POSSESSION: ga.possession ?? 50, HOME_SHOTS: gh.shots ?? 0, AWAY_SHOTS: ga.shots ?? 0, HOME_SHOTS_ON_TARGET: gh.shots_on_target ?? 0, AWAY_SHOTS_ON_TARGET: ga.shots_on_target ?? 0, HOME_CORNERS: gh.corners ?? 0, AWAY_CORNERS: ga.corners ?? 0, HOME_FOULS: gh.fouls ?? 0, AWAY_FOULS: ga.fouls ?? 0 });
      takeGraphic('Statistics');
      addLog('Statistics graphic triggered', 'graphic');
    } catch (e) { addLog('Statistics graphic failed', 'warning'); }
  }

  function takeLineup() {
    sendGraphicData('Lineup', { HOME_NAME: home?.name || '', AWAY_NAME: away?.name || '', HOME_FORMATION: home?.formation || '', AWAY_FORMATION: away?.formation || '', HOME_COACH: home?.coach || '', AWAY_COACH: away?.coach || '' });
    takeGraphic('Lineup');
    addLog('Lineup graphic triggered (both teams)', 'graphic');
  }

  async function setHalfTime() {
    setRunning(false);
    if (match) { await localEntities.Match.update(match.id, { status: 'halftime', current_half: half, current_minute: minute }); setMatch({ ...match, status: 'halftime' }); }
    addLog('HALF TIME', 'warning');
  }

  async function setFullTime() {
    setRunning(false);
    clearAllGraphics();
    if (match) { await localEntities.Match.update(match.id, { status: 'finished', current_minute: minute }); setMatch({ ...match, status: 'finished' }); }
    addLog('FULL TIME — all graphics cleared', 'warning');
  }

  function clearGraphics() {
    clearAllGraphics();
    addLog('Clear all graphics (emergency)', 'warning');
  }

  const deleteEvent = async (id) => {
    await localEntities.MatchEvent.delete(id);
    setEvents((p) => p.filter((e) => e.id !== id));
    addLog('Event deleted', 'warning');
  };

  // Keyboard shortcuts
  handlersRef.current = { toggleClock, openAction, takeLineup, takeStats, clearGraphics };
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (e.key === ' ') { e.preventDefault(); handlersRef.current.toggleClock(); return; }
      if (e.key === 'Escape' && modal) { setModal(null); return; }
      const action = shortcuts[e.key];
      if (!action) return;
      e.preventDefault();
      const h = handlersRef.current;
      switch (action) {
        case 'goal': case 'yellow': case 'red': case 'sub': case 'lowerthird': case 'coach': case 'var': h.openAction(action); break;
        case 'lineup': h.takeLineup(); break;
        case 'stats': h.takeStats(); break;
        case 'clear': h.clearGraphics(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcuts, modal]);

  if (!match) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <AlertCircle size={42} className="mx-auto text-amber-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No active match</h2>
        <p className="text-sm text-slate-400 mb-6">Load a match from the Matches page to begin live operation.</p>
        <Link to="/matches" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"><Trophy size={16} /> Go to Matches</Link>
      </div>
    );
  }

  const TeamBlock = ({ side }) => {
    const team = side === 'home' ? home : away;
    const ActionBtn = ({ type, icon: Icon, label }) => (
      <button onClick={() => openAction(type, side)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-sm font-medium border border-white/10 w-full">
        <Icon size={15} /> {label}
      </button>
    );
    return (
      <div className="rounded-2xl border p-4 flex flex-col gap-2" style={{ borderColor: (team?.primary_color || '#1e3a8a') + '55' }}>
        <div className="flex items-center gap-3 mb-1">
          {team?.logo_url ? <img src={team.logo_url} alt="" className="w-10 h-10 object-contain rounded" /> : <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: team?.primary_color || '#1e3a8a', color: team?.secondary_color || '#fff' }}>{team?.short_name?.slice(0, 3) || '—'}</div>}
          <div className="min-w-0">
            <div className="text-white font-semibold truncate">{team?.name || (side === 'home' ? 'Home' : 'Away')}</div>
            <div className="text-[11px] text-slate-500">{getPlayers(side).length} players · Coach: {team?.coach || '—'}</div>
          </div>
        </div>
        <ActionBtn type="goal" icon={Goal} label="Goal" />
        <ActionBtn type="yellow" icon={Square} label="Yellow Card" />
        <ActionBtn type="red" icon={Ban} label="Red Card" />
        <ActionBtn type="sub" icon={Repeat} label="Substitution" />
        <ActionBtn type="coach" icon={User} label="Coach" />
        <ActionBtn type="lowerthird" icon={User} label="Player Lower Third" />
      </div>
    );
  };

  return (
    <div className="max-w-[1800px] mx-auto space-y-4">
      {/* Status bar */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${connected ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{connected ? <Wifi size={13} /> : <WifiOff size={13} />} VMIX {connected ? 'CONNECTED' : connecting ? 'CONNECTING' : 'DISCONNECTED'}</div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-green-500/10 text-green-400 border-green-500/20"><Database size={13} /> LOCAL DATA READY</div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${online ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>{online ? <Wifi size={13} /> : <WifiOff size={13} />} INTERNET {online ? 'ONLINE' : 'OFFLINE'}</div>
        {!connected && <button onClick={connect} disabled={connecting} className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium disabled:opacity-50">CONNECT VMIX</button>}
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300">{match.competition || 'Match'} · <span className="text-white font-medium">{home?.short_name || 'HOM'} {match.home_score ?? 0} – {match.away_score ?? 0} {away?.short_name || 'AWY'}</span></div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${saving ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-white/5 text-slate-300 border-white/10'}`}>{saving ? 'SAVING…' : 'SAVED'}</div>
      </div>

      {/* Scoreboard + clock */}
      <div className="rounded-2xl bg-gradient-to-b from-[#0d0f14] to-black border border-white/10 overflow-hidden">
        <div className="px-5 py-2 flex items-center justify-between bg-white/[0.03]">
          <span className="text-xs uppercase tracking-widest text-slate-500">{running ? <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE</span> : 'PAUSED'}</span>
          <span className="text-xs text-slate-500">{match.competition || ''} · {match.venue || 'TBD'}</span>
        </div>
        <div className="p-5 sm:p-6 flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            {home?.logo_url ? <img src={home.logo_url} alt="" className="w-16 h-16 sm:w-20 sm:h-20 mx-auto object-contain mb-2" /> : <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl flex items-center justify-center text-xl font-bold mb-2" style={{ background: home?.primary_color || '#1e3a8a', color: home?.secondary_color || '#fff' }}>{home?.short_name?.slice(0, 3) || 'HOM'}</div>}
            <div className="text-white font-medium text-sm truncate">{home?.name || 'Home'}</div>
          </div>
          <div className="text-center px-3">
            <div className="text-5xl sm:text-6xl font-bold text-white tabular-nums">{match.home_score ?? 0} <span className="text-slate-700">:</span> {match.away_score ?? 0}</div>
            <div className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
              <Clock size={14} className="text-blue-400" />
              <span className="text-2xl font-mono tabular-nums text-white">{mm}:{ss}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1.5">{half === 1 ? '1st Half' : half === 2 ? '2nd Half' : 'Extra Time'}{extra > 0 && <span className="text-amber-400"> +{extra}</span>}</div>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs">
              {!running ? <button onClick={toggleClock} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white"><Play size={13} /> Start</button> : <button onClick={toggleClock} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white"><Pause size={13} /> Pause</button>}
              <button onClick={resetClock} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"><RotateCcw size={13} /> Reset</button>
              <button onClick={() => setSeconds((s) => s + 60)} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"><Plus size={13} /> 1m</button>
              <button onClick={() => setSeconds((s) => Math.max(0, s - 60))} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"><Minus size={13} /> 1m</button>
              <button onClick={() => persistClock()} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300">Save</button>
            </div>
            <div className="mt-2 flex gap-1.5 justify-center">
              {[1, 2, 3].map((h) => <button key={h} onClick={() => setHalf(h)} className={`px-2.5 py-1 rounded text-[11px] font-medium ${half === h ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'}`}>{h === 3 ? 'ET' : `${h}H`}</button>)}
              <button onClick={() => setExtra((e) => e + 1)} className="px-2.5 py-1 rounded bg-white/5 text-slate-400 text-[11px]">+Stop</button>
              <button onClick={() => setExtra((e) => Math.max(0, e - 1))} className="px-2.5 py-1 rounded bg-white/5 text-slate-400 text-[11px]">-Stop</button>
            </div>
          </div>
          <div className="flex-1 text-center">
            {away?.logo_url ? <img src={away.logo_url} alt="" className="w-16 h-16 sm:w-20 sm:h-20 mx-auto object-contain mb-2" /> : <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl flex items-center justify-center text-xl font-bold mb-2" style={{ background: away?.primary_color || '#9a1a1a', color: away?.secondary_color || '#fff' }}>{away?.short_name?.slice(0, 3) || 'AWY'}</div>}
            <div className="text-white font-medium text-sm truncate">{away?.name || 'Away'}</div>
          </div>
        </div>
      </div>

      {/* Team columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-2 px-1">Home Team</div>
          <TeamBlock side="home" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-2 px-1">Away Team</div>
          <TeamBlock side="away" />
        </div>
      </div>

      {/* Global action bar */}
      <div className="sticky bottom-2 z-20">
        <div className="rounded-2xl bg-[#0d0f14]/95 backdrop-blur-xl border border-white/10 p-2 shadow-2xl">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <BarBtn icon={Goal} label="Goal" onClick={() => openAction('goal')} tone="green" />
            <BarBtn icon={Square} label="Yellow" onClick={() => openAction('yellow')} tone="yellow" />
            <BarBtn icon={Ban} label="Red" onClick={() => openAction('red')} tone="red" />
            <BarBtn icon={Repeat} label="Sub" onClick={() => openAction('sub')} />
            <BarBtn icon={User} label="Lower 3rd" onClick={() => openAction('lowerthird')} />
            <BarBtn icon={User} label="Coach" onClick={() => openAction('coach')} />
            <BarBtn icon={LayoutGrid} label="Lineup" onClick={takeLineup} />
            <BarBtn icon={BarChart3} label="Stats" onClick={takeStats} />
            <BarBtn icon={ShieldAlert} label="VAR" onClick={() => openAction('var')} tone="purple" />
            <BarBtn icon={Flag} label="Half Time" onClick={setHalfTime} />
            <BarBtn icon={FlagTriangleRight} label="Full Time" onClick={setFullTime} />
            <BarBtn icon={Eraser} label="Clear" onClick={clearGraphics} tone="red" />
          </div>
        </div>
      </div>

      <MatchTimeline events={events} teams={teamsMap} onDelete={deleteEvent} />

      {modal && <ActionModal modal={modal} home={home} away={away} getPlayers={getPlayers} minute={minute} onTake={onTake} onPreview={onPreview} onOut={onOut} onClose={() => setModal(null)} />}
    </div>
  );
}

function BarBtn({ icon: Icon, label, onClick, tone }) {
  const tones = { green: 'bg-green-600 hover:bg-green-500', yellow: 'bg-yellow-600 hover:bg-yellow-500', red: 'bg-red-600 hover:bg-red-500', purple: 'bg-purple-600 hover:bg-purple-500', default: 'bg-white/5 hover:bg-white/10 text-slate-200' };
  const cls = tones[tone] || tones.default;
  const textTone = tone ? 'text-white' : '';
  return <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${cls} ${textTone} transition-all`}><Icon size={15} /> {label}</button>;
}