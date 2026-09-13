import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createVmixHttp } from './vmixHttp';
import { GRAPHIC_KEYS, AUTO_MATCH_RULES, DEFAULT_GRAPHIC_INPUTS, DEFAULT_FIELD_MAP, DEFAULT_SHORTCUTS } from './vmixDefaults';

const VmixContext = createContext(null);
// ISOLATED system clock — only the header/topbar subscribes to this, so the
// per-second tick never re-renders forms, modals, dropdowns or pages.
const ClockContext = createContext(null);

const STORAGE_KEY = 'vmix_controller_state_v1';

const now = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

const DEFAULT_STATE = {
  settings: { ip: '127.0.0.1', port: 8088, autoReconnect: true },
  operatorName: 'Operator',
  activeMatchId: null,
  offlineMatchMode: false,
  lastConnection: null,
  responseTime: null,
  vmixInputs: [],
  log: [],
  graphicInputMap: DEFAULT_GRAPHIC_INPUTS,
  fieldMap: DEFAULT_FIELD_MAP,
  shortcuts: DEFAULT_SHORTCUTS,
  lastCommand: null,
};

export function useClock() {
  const c = useContext(ClockContext);
  return c || new Date();
}

export function VmixProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        return {
          ...DEFAULT_STATE,
          ...s,
          settings: { ...DEFAULT_STATE.settings, ...(s.settings || {}), port: (s.settings && s.settings.port && s.settings.port !== 8099) ? s.settings.port : 8088 },
          graphicInputMap: { ...DEFAULT_GRAPHIC_INPUTS, ...(s.graphicInputMap || {}) },
          fieldMap: { ...DEFAULT_FIELD_MAP, ...(s.fieldMap || {}) },
          shortcuts: { ...DEFAULT_SHORTCUTS, ...(s.shortcuts || {}) },
        };
      }
    } catch (e) {}
    return DEFAULT_STATE;
  });

  // vMix link state. `connected` is ONLY true when the real bridge answered —
  // never for simulated fallback (§17). `simulated` marks the honest demo state.
  const [connected, setConnected] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Direct vMix Web API client (no bridge). Rebuilt when IP/port change.
  const vmix = useMemo(() => createVmixHttp({ host: state.settings.ip, port: state.settings.port }), [state.settings.ip, state.settings.port]);

  // ISOLATED clock — lives in its own context so ticking it does not force the
  // rest of the app to re-render (§4).
  const [clock, setClock] = useState(new Date());

  // Persist only durable configuration (never the live clock / transient log).
  useEffect(() => {
    const { settings, operatorName, activeMatchId, offlineMatchMode, graphicInputMap, fieldMap, shortcuts } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, operatorName, activeMatchId, offlineMatchMode, graphicInputMap, fieldMap, shortcuts }));
  }, [state.settings, state.operatorName, state.activeMatchId, state.offlineMatchMode, state.graphicInputMap, state.fieldMap, state.shortcuts]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const addLog = useCallback((message, type = 'info') => {
    setState((s) => ({
      ...s,
      log: [{ id: Date.now() + Math.random(), message, type, time: new Date().toISOString() }, ...s.log].slice(0, 300),
    }));
  }, []);

  // Latest graphic->input map in a ref so autoMap can read it without forcing
  // connect/refresh callbacks to depend on (and re-create for) every mapping edit.
  const graphicInputMapRef = useRef(state.graphicInputMap);
  useEffect(() => { graphicInputMapRef.current = state.graphicInputMap; }, [state.graphicInputMap]);

  // Match vMix titles already in the project to our graphics by name, filling
  // only blanks (never overwriting an operator's manual mapping). Returns how
  // many new mappings were applied.
  const autoMapInputs = useCallback((inputList) => {
    const titles = Array.isArray(inputList)
      ? inputList.map((i) => (typeof i === 'string' ? i : i?.title)).filter(Boolean)
      : [];
    if (!titles.length) return 0;
    const filled = {};
    let count = 0;
    GRAPHIC_KEYS.forEach((g) => {
      if (graphicInputMapRef.current[g]) return;
      const rules = AUTO_MATCH_RULES[g] || [];
      const hit = titles.find((t) => rules.some((r) => r.test(t)));
      if (hit) { filled[g] = hit; count++; }
    });
    if (count) setState((s) => ({ ...s, graphicInputMap: { ...s.graphicInputMap, ...filled } }));
    return count;
  }, []);

  // REAL connection = the local Node bridge answered. Otherwise SIMULATION.
  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const res = await vmix.ping();
      if (res?.ok && res.reachable) {
        setConnected(true); setSimulated(false); setConnecting(false);
        const titles = (res.inputs || []).map((i) => (typeof i === 'string' ? i : i?.title)).filter(Boolean);
        setState((s) => ({ ...s, lastConnection: new Date().toISOString(), responseTime: res.ms ?? null, vmixInputs: titles.length ? titles : s.vmixInputs }));
        const mapped = autoMapInputs(res.inputs || []);
        addLog(`Connected to vMix (REAL) via Web API — ${titles.length} title(s) detected${mapped ? `, ${mapped} graphic(s) auto-mapped` : ''}${titles.length ? '' : ' · map inputs manually on the vMix page'}`, 'success');
        return;
      }
      setConnected(false); setSimulated(true); setConnecting(false);
      setState((s) => ({ ...s, lastConnection: new Date().toISOString(), responseTime: null, vmixInputs: ['Score Bug', 'Player Lower Third', 'Goal', 'Substitution', 'Starting XI', 'Full Screen'] }));
      addLog(`Cannot reach vMix Web API at ${state.settings.ip}:${state.settings.port} — ${res?.error || 'no response'}. SIMULATION mode. Enable vMix Web Controller (vMix Settings → Web Controller, default port 8088) and check IP/port. The published HTTPS site cannot reach a local HTTP vMix (browser blocks it) — run the app locally or as the desktop app.`, 'warning');
    } catch (e) {
      setConnected(false); setSimulated(false); setConnecting(false);
      addLog('vMix connection error — ' + (e?.message || 'unknown'), 'warning');
    }
  }, [vmix, addLog, autoMapInputs, state.settings.ip, state.settings.port]);

  const disconnect = useCallback(() => {
    setConnected(false);
    setSimulated(false);
    setConnecting(false);
    addLog('Disconnected from vMix', 'warning');
  }, [addLog]);

  const test = useCallback(async () => {
    setConnecting(true);
    const t0 = now();
    try {
      const res = await vmix.ping();
      const ms = Math.round(now() - t0);
      if (res?.ok && res.reachable) {
        setConnecting(false);
        setConnected(true); setSimulated(false);
        setState((s) => ({ ...s, lastConnection: new Date().toISOString(), responseTime: ms }));
        addLog(`vMix test OK — REAL Web API (${ms}ms)`, 'success');
        return { ok: true, ms, mode: 'real' };
      }
      setConnecting(false); setSimulated(true);
      setState((s) => ({ ...s, lastConnection: new Date().toISOString(), responseTime: null }));
      addLog(`vMix test — unreachable at ${state.settings.port === 8088 ? `${state.settings.ip}:8088` : `${state.settings.ip}:${state.settings.port}`} (${res?.error || 'no response'})`, 'warning');
      return { ok: false, ms: null, mode: 'offline' };
    } catch (e) {
      setConnecting(false);
      addLog('vMix test error — ' + (e?.message || 'unknown'), 'warning');
      return { ok: false, ms: null, mode: 'offline' };
    }
  }, [vmix, addLog, state.settings.ip, state.settings.port]);

  const refreshInputs = useCallback(async () => {
    try {
      const res = await vmix.ping();
      if (res?.ok && res.reachable) {
        const titles = (res.inputs || []).map((i) => (typeof i === 'string' ? i : i?.title)).filter(Boolean);
        if (titles.length) {
          setState((s) => ({ ...s, vmixInputs: titles }));
          const mapped = autoMapInputs(res.inputs || []);
          addLog(`vMix inputs refreshed (REAL, ${titles.length})${mapped ? `, ${mapped} graphic(s) auto-mapped` : ''}`, 'success');
        } else {
          setState((s) => ({ ...s, vmixInputs: ['Score Bug', 'Player Lower Third', 'Goal', 'Substitution', 'Starting XI', 'Full Screen'] }));
          addLog('vMix reachable but titles not readable (browser CORS limits Web API reads) — map inputs manually on the vMix page', 'warning');
        }
        return;
      }
    } catch (e) {}
    setState((s) => ({ ...s, vmixInputs: ['Score Bug', 'Player Lower Third', 'Goal', 'Substitution', 'Starting XI', 'Full Screen'] }));
    addLog('vMix unreachable — inputs not refreshed', 'warning');
  }, [vmix, addLog, autoMapInputs]);

  const updateSettings = useCallback((settings) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...settings } }));
  }, []);

  const setActiveMatch = useCallback((matchId) => {
    setState((s) => ({ ...s, activeMatchId: matchId }));
    addLog('Active match set', 'info');
  }, [addLog]);

  const setOperatorName = useCallback((name) => {
    setState((s) => ({ ...s, operatorName: name }));
  }, []);

  const setOfflineMatchMode = useCallback((v) => {
    setState((s) => ({ ...s, offlineMatchMode: v }));
    addLog(v ? 'Offline Match Mode enabled — local data only' : 'Offline Match Mode disabled', v ? 'warning' : 'info');
  }, [addLog]);

  const setGraphicInput = useCallback((graphic, input) => {
    setState((s) => ({ ...s, graphicInputMap: { ...s.graphicInputMap, [graphic]: input } }));
  }, []);

  const setField = useCallback((graphic, key, field) => {
    setState((s) => ({ ...s, fieldMap: { ...s.fieldMap, [graphic]: { ...(s.fieldMap[graphic] || {}), [key]: field } } }));
  }, []);

  const setShortcut = useCallback((action, key) => {
    setState((s) => {
      const next = { ...s.shortcuts };
      Object.keys(next).forEach((k) => { if (next[k] === action) delete next[k]; });
      if (key) next[key] = action;
      return { ...s, shortcuts: next };
    });
  }, []);

  // Command queue: serialize vMix writes so overlapping TAKE actions cannot
  // interleave SetText/OverlayIn for different graphics (§19).
  const queueTail = useRef(Promise.resolve());
  const enqueue = useCallback((fn) => {
    const run = queueTail.current.then(fn, fn);
    queueTail.current = run.catch(() => {});
    return run;
  }, []);

  const sendGraphicData = useCallback((graphic, data) => {
    const input = state.graphicInputMap[graphic];
    if (!input) { addLog(`No vMix input mapped for "${graphic}" — configure it on the vMix page`, 'warning'); return { ok: false }; }
    const fm = state.fieldMap[graphic] || {};
    const entries = Object.entries(data || {});
    const real = connected;
    enqueue(() => {
      entries.forEach(([key, value]) => {
        const field = fm[key] || key;
        vmix.setText(input, field, value == null ? '' : String(value));
      });
    });
    setState((s) => ({ ...s, lastCommand: { graphic, input, fields: entries.length, time: new Date().toISOString(), result: real ? 'sent' : 'simulated', command: 'SetText' } }));
    addLog(`SetText → ${graphic} (input "${input}"): ${entries.length} fields ${real ? '' : '· simulated'}`, 'graphic');
    return { ok: true, simulated: !real };
  }, [state.graphicInputMap, state.fieldMap, addLog, connected, enqueue, vmix]);

  const takeGraphic = useCallback((graphic, layer = 1) => {
    const input = state.graphicInputMap[graphic];
    if (!input) { addLog(`Cannot take "${graphic}" — no input mapped`, 'warning'); return; }
    const real = connected;
    enqueue(() => { vmix.overlayIn(input, layer); });
    setState((s) => ({ ...s, lastCommand: { graphic, input, time: new Date().toISOString(), result: real ? 'sent' : 'simulated', command: 'OverlayIn' } }));
    addLog(`OverlayIn → ${graphic} (input "${input}")`, 'graphic');
  }, [state.graphicInputMap, addLog, connected, enqueue, vmix]);

  const outGraphic = useCallback((graphic, layer = 1) => {
    const input = state.graphicInputMap[graphic];
    if (!input) { addLog(`Cannot out "${graphic}" — no input mapped`, 'warning'); return; }
    const real = connected;
    enqueue(() => { vmix.overlayOut(input, layer); });
    setState((s) => ({ ...s, lastCommand: { graphic, input, time: new Date().toISOString(), result: real ? 'sent' : 'simulated', command: 'OverlayOut' } }));
    addLog(`OverlayOut → ${graphic} (input "${input}")`, 'graphic');
  }, [state.graphicInputMap, addLog, connected, enqueue, vmix]);

  const clearAllGraphics = useCallback(() => {
    const inputs = Object.values(state.graphicInputMap || {}).filter(Boolean);
    const real = connected;
    enqueue(() => { inputs.forEach((input) => vmix.overlayOut(input, 1)); });
    setState((s) => ({ ...s, lastCommand: { graphic: 'ALL', time: new Date().toISOString(), result: real ? 'sent' : 'simulated', command: 'OverlayOut (all)' } }));
    addLog('Cleared all graphics (OverlayOut all inputs)', 'warning');
  }, [state.graphicInputMap, addLog, connected, enqueue, vmix]);

  // value is MEMOIZED away from the clock — a clock tick never changes its
  // identity, so useVmix() consumers do not re-render every second.
  const value = useMemo(() => {
    const mode = connected ? 'real' : simulated ? 'sim' : 'offline';
    return {
      settings: state.settings,
      operatorName: state.operatorName,
      activeMatchId: state.activeMatchId,
      log: state.log,
      connected,
      simulated,
      mode,
      connecting,
      connect, disconnect, updateSettings,
      setActiveMatch,
      setOperatorName,
      addLog,
      offlineMatchMode: state.offlineMatchMode, setOfflineMatchMode,
      lastConnection: state.lastConnection, responseTime: state.responseTime,
      test,
      vmixInputs: state.vmixInputs, refreshInputs,
      vmix,
      graphicInputMap: state.graphicInputMap, fieldMap: state.fieldMap, shortcuts: state.shortcuts,
      lastCommand: state.lastCommand,
      setGraphicInput, setField, setShortcut,
      sendGraphicData, takeGraphic, outGraphic, clearAllGraphics,
    };
    // `clock` is intentionally NOT a dependency — it lives in ClockContext.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, connected, simulated, connecting]);

  return (
    <VmixContext.Provider value={value}>
      <ClockContext.Provider value={clock}>{children}</ClockContext.Provider>
    </VmixContext.Provider>
  );
}

export function useVmix() {
  const ctx = useContext(VmixContext);
  if (!ctx) throw new Error('useVmix must be used within VmixProvider');
  return ctx;
}