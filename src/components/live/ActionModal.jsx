import React, { useState, useEffect } from 'react';
import { X, Users, Square, Ban, Repeat, User, ShieldAlert, Eye, ArrowUp, ArrowDown, Check } from 'lucide-react';

const inputCls = 'w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white outline-none focus:border-blue-500 transition-colors';
const labelCls = 'block text-xs text-slate-400 mb-1.5';

function option(p) { return { value: p.id, label: `${p.number != null ? '#' + p.number + ' ' : ''}${p.full_name || ''}` }; }

// Module-scope so React keeps the same component identity across renders —
// without this, the form remounts on every keystroke and inputs drop focus.
function MinuteField({ value, onChange }) {
  return (
    <div>
      <label className={labelCls}>Minute</label>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(Math.max(0, (Number(value) || 0) - 1))} className="px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm">-</button>
        <input type="number" min={0} value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} className={inputCls + ' text-center'} />
        <button type="button" onClick={() => onChange((Number(value) || 0) + 1)} className="px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm">+</button>
      </div>
    </div>
  );
}

function Shell({ title, icon: Icon, subtitle, children, onClose }) {
  return (
    <div className="w-full max-w-lg rounded-2xl bg-gradient-to-b from-[#0d0f14] to-black border border-white/10 shadow-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-white font-bold flex items-center gap-2 text-lg"><Icon size={20} className="text-blue-400" /> {title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
      </div>
      <div className="text-[11px] text-slate-500 mb-4 uppercase tracking-widest">{subtitle}</div>
      {children}
    </div>
  );
}

function TakeBtn({ onClick, disabled, label = 'TAKE', icon: Icon = Check, tone = 'green' }) {
  const toneCls = tone === 'green' ? 'bg-green-600 hover:bg-green-500' : tone === 'blue' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-white/10 hover:bg-white/15';
  return (
    <button onClick={onClick} disabled={disabled} className={`w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl ${toneCls} text-white text-base font-bold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-black/30`}>
      <Icon size={18} /> {label}
    </button>
  );
}

function SideToggle({ home, away, side, onChange }) {
  return (
    <div className="flex gap-2 mb-4">
      {['home', 'away'].map((s) => {
        const t = s === 'home' ? home : away;
        const active = side === s;
        return (
          <button key={s} onClick={() => onChange(s)} className="flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold border transition-all"
            style={active ? { background: t?.primary_color || '#1e3a8a', color: t?.secondary_color || '#fff', borderColor: 'transparent' } : { background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', borderColor: 'rgba(255,255,255,0.1)' }}>
            {s === 'home' ? 'HOME' : 'AWAY'} · {t?.short_name || '—'}
          </button>
        );
      })}
    </div>
  );
}

export default function ActionModal({ modal, home, away, getPlayers, minute, onTake, onPreview, onOut, onClose }) {
  const [side, setSide] = useState('home');
  const [scorerId, setScorerId] = useState('');
  const [assistId, setAssistId] = useState('');
  const [goalType, setGoalType] = useState('Normal');
  const [isVar, setIsVar] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [reason, setReason] = useState('');
  const [outId, setOutId] = useState('');
  const [inId, setInId] = useState('');
  const [status, setStatus] = useState('Check');
  const [localMinute, setLocalMinute] = useState(minute ?? 0);

  useEffect(() => {
    if (modal) {
      setSide(modal.side || 'home'); setScorerId(''); setAssistId(''); setGoalType('Normal'); setIsVar(false);
      setPlayerId(''); setReason(''); setOutId(''); setInId(''); setStatus('Check'); setLocalMinute(minute ?? 0);
    }
  }, [modal, minute]);

  if (!modal) return null;

  const team = side === 'home' ? home : away;
  const players = getPlayers(side);
  const opts = players.map(option);
  const subtitle = `${team?.name || ''} · Minute ${localMinute}'`;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        {modal.type === 'goal' && (
          <Shell title="GOAL" icon={Users} subtitle={subtitle} onClose={onClose}>
            <SideToggle home={home} away={away} side={side} onChange={setSide} />
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Scorer</label><select value={scorerId} onChange={(e) => setScorerId(e.target.value)} className={inputCls}><option value="">— Select scorer —</option>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              <div><label className={labelCls}>Assist</label><select value={assistId} onChange={(e) => setAssistId(e.target.value)} className={inputCls}><option value="">— none —</option>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              <div><MinuteField value={localMinute} onChange={setLocalMinute} /></div>
              <div><label className={labelCls}>Type</label><select value={goalType} onChange={(e) => setGoalType(e.target.value)} className={inputCls}>{['Normal', 'Penalty', 'Own Goal'].map((g) => <option key={g}>{g}</option>)}</select></div>
            </div>
            <label className="flex items-center gap-2 mt-3 text-sm text-slate-300"><input type="checkbox" checked={isVar} onChange={(e) => setIsVar(e.target.checked)} className="accent-blue-500" /> VAR check required</label>
            <TakeBtn onClick={() => onTake({ type: 'goal', side, scorerId, assistId, minute: localMinute, goalType, isVar })} disabled={!scorerId} />
          </Shell>
        )}

        {modal.type === 'yellow' && (
          <Shell title="YELLOW CARD" icon={Square} subtitle={subtitle} onClose={onClose}>
            <SideToggle home={home} away={away} side={side} onChange={setSide} />
            <div><label className={labelCls}>Player</label><select value={playerId} onChange={(e) => setPlayerId(e.target.value)} className={inputCls}><option value="">— Select player —</option>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div className="mt-3"><MinuteField value={localMinute} onChange={setLocalMinute} /></div>
            <TakeBtn onClick={() => onTake({ type: 'yellow', side, playerId, minute: localMinute })} disabled={!playerId} />
          </Shell>
        )}

        {modal.type === 'red' && (
          <Shell title="RED CARD" icon={Ban} subtitle={subtitle} onClose={onClose}>
            <SideToggle home={home} away={away} side={side} onChange={setSide} />
            <div><label className={labelCls}>Player</label><select value={playerId} onChange={(e) => setPlayerId(e.target.value)} className={inputCls}><option value="">— Select player —</option>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Reason</label><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Second yellow / Violent conduct / DOGSO…" className={inputCls} /></div>
              <MinuteField value={localMinute} onChange={setLocalMinute} />
            </div>
            <TakeBtn onClick={() => onTake({ type: 'red', side, playerId, minute: localMinute, reason })} disabled={!playerId} />
          </Shell>
        )}

        {modal.type === 'sub' && (
          <Shell title="SUBSTITUTION" icon={Repeat} subtitle={subtitle} onClose={onClose}>
            <SideToggle home={home} away={away} side={side} onChange={setSide} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls + ' flex items-center gap-1'}><ArrowDown size={12} className="text-red-400" /> OUT</label>
                <select value={outId} onChange={(e) => setOutId(e.target.value)} className={inputCls}><option value="">— player out —</option>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
              </div>
              <div>
                <label className={labelCls + ' flex items-center gap-1'}><ArrowUp size={12} className="text-green-400" /> IN</label>
                <select value={inId} onChange={(e) => setInId(e.target.value)} className={inputCls}><option value="">— player in —</option>{opts.filter((o) => o.value !== outId).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
              </div>
              <div className="col-span-2"><MinuteField value={localMinute} onChange={setLocalMinute} /></div>
            </div>
            <TakeBtn onClick={() => onTake({ type: 'sub', side, outId, inId, minute: localMinute })} disabled={!outId || !inId} />
          </Shell>
        )}

        {modal.type === 'lowerthird' && (
          <Shell title="PLAYER LOWER THIRD" icon={User} subtitle={subtitle} onClose={onClose}>
            <SideToggle home={home} away={away} side={side} onChange={setSide} />
            <div><label className={labelCls}>Player</label><select value={playerId} onChange={(e) => setPlayerId(e.target.value)} className={inputCls}><option value="">— Select player —</option>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button onClick={() => onPreview({ type: 'lowerthird', side, playerId })} disabled={!playerId} className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-sm font-medium disabled:opacity-40"><Eye size={15} /> Preview</button>
              <button onClick={() => onTake({ type: 'lowerthird', side, playerId })} disabled={!playerId} className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold disabled:opacity-40"><Check size={15} /> Take</button>
              <button onClick={() => onOut()} className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-sm font-medium"><X size={15} /> Out</button>
            </div>
          </Shell>
        )}

        {modal.type === 'coach' && (
          <Shell title="COACH GRAPHIC" icon={User} subtitle={subtitle} onClose={onClose}>
            <SideToggle home={home} away={away} side={side} onChange={setSide} />
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm space-y-1">
              <div className="text-slate-400 text-xs uppercase tracking-wider">Head Coach</div>
              <div className="text-white font-medium">{team?.coach || '—'}</div>
              <div className="text-xs text-slate-500">{team?.name} · {team?.country || ''}</div>
            </div>
            <TakeBtn onClick={() => onTake({ type: 'coach', side })} label="TAKE COACH" tone="blue" />
          </Shell>
        )}

        {modal.type === 'var' && (
          <Shell title="VAR" icon={ShieldAlert} subtitle={subtitle} onClose={onClose}>
            <SideToggle home={home} away={away} side={side} onChange={setSide} />
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Status</label><select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>{['Check', 'Confirmed', 'Overturned', 'No Goal', 'No Penalty'].map((s) => <option key={s}>{s}</option>)}</select></div>
              <MinuteField value={localMinute} onChange={setLocalMinute} />
            </div>
            <div className="mt-3"><label className={labelCls}>Reason</label><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Penalty review / offside / red card…" className={inputCls} /></div>
            <TakeBtn onClick={() => onTake({ type: 'var', side, status, reason, minute: localMinute })} label="TAKE VAR" tone="blue" />
          </Shell>
        )}
      </div>
    </div>
  );
}