import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { vmixBridge } from './vmixBridge';
import { GRAPHIC_KEYS, AUTO_MATCH_RULES, DEFAULT_GRAPHIC_INPUTS, DEFAULT_FIELD_MAP, DEFAULT_SHORTCUTS } from './vmixDefaults';

const VmixContext = createContext(null);
// ISOLATED system clock — only the header/topbar subscribes to this, so the
// per-second tick never re-renders forms, modals, dropdowns or pages.
const ClockContext = createContext(null);

const STORAGE_KEY = 'vmix_controller_state_v1';

const now = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

const DEFAULT_STATE = {
  settings: { ip: '127.0.0.1', port: 8099, autoReconnect: true },
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
      const res = await vmixBridge.ping();
      if (res?.ok) {
        if (res.reachable === false) {
          setConnected(false); setSimulated(false); setConnecting(false);
          setState((s) => ({ ...s, lastConnection: new Date().toISOString(), responseTime: res.ms ?? null }));
          addLog('Bridge running but vMix not responding — check vMix is open and IP/port are correct', 'warning');
          return;
        }
        setConnected(true); setSimulated(false); setConnecting(false);
        const inputs = Array.isArray(res.inputs) ? res.inputs : [];
        const titles = inputs.map((i) => (typeof i === 'string' ? i : i?.title)).filter(Boolean);
        setState((s) => ({ ...s, lastConnection: new Date().toISOString(), responseTime: res.ms ?? null, vmixInputs: titles.length ? titles : s.vmixInputs }));
        const mapped = autoMapInputs(inputs);
        addLog(`Connected to vMix (REAL) — ${titles.length} title(s) detected${mapped ? `, ${mapped} graphic(s) auto-mapped` : ''}`, 'success');
        return;
      }
    } catch (e) {}
    setTimeout(() => {
      setConnected(false); setSimulated(true); setConnecting(false);
      setState((s) => ({ ...s, lastConnection: new Date().toISOString(), responseTime: null, vmixInputs: ['Score Bug', 'Player Lower Third', 'Goal', 'Substitution', 'Starting XI', 'Full Screen'] }));
      addLog('vMix bridge not running — SIMULATION mode (run desktop/vmix-bridge.js for real control)', 'warning');
    }, 400);
  }, [addLog, autoMapInputs]);

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
      const res = await vmixBridge.ping();
      if (res?.ok && res.reachable !== false) {
        const ms = Math.round(now() - t0);
        setConnecting(false);
        setConnected(true); setSimulated(false);
        setState((s) => ({ ...s, lastConnection: new Date().toISOString(), responseTime: ms }));
        addLog(`vMix test OK — REAL (${ms}ms)`, 'success');
        return { ok: true, ms, mode: 'real' };
      }
    } catch (e) {}
    return new Promise((resolve) => {
      setTimeout(() => {
        const ok = Math.random() > 0.15;
        const ms = Math.round(20 + Math.random() * 80);
        setConnecting(false); setSimulated(true);
        setState((s) => ({ ...s, lastConnection: new Date().toISOString(), responseTime: ms }));
        if (ok) { addLog(`vMix test — SIMULATION (${ms}ms)`, 'warning'); resolve({ ok: true, ms, mode: 'sim' }); }
        else { addLog('vMix test failed — bridge unreachable', 'warning'); resolve({ ok: false, ms: null, mode: 'offline' }); }
      }, 500);
    });
  }, [addLog]);

  const refreshInputs = useCallback(async () => {
    try {
      const res = await vmixBridge.ping();
      if (res?.ok && res.reachable !== false) {
        const inputs = Array.isArray(res.inputs) ? res.inputs : [];
        const titles = inputs.map((i) => (typeof i === 'string' ? i : i?.title)).filter(Boolean);
        if (titles.length) {
          setState((s) => ({ ...s, vmixInputs: titles }));
          const mapped = autoMapInputs(inputs);
          addLog(`vMix inputs refreshed (REAL, ${titles.length})${mapped ? `, ${mapped} graphic(s) auto-mapped` : ''}`, 'success');
        } else {
          addLog('vMix connected but no inputs found in project', 'warning');
        }
        return;
      }
    } catch (e) {}
    setState((s) => ({ ...s, vmixInputs: ['Score Bug', 'Player Lower Third', 'Goal', 'Substitution', 'Starting XI', 'Full Screen'] }));
    addLog('vMix inputs refreshed (SIMULATION)', 'info');
  }, [addLog, autoMapInputs]);

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
        vmixBridge.setText(input, field, value == null ? '' : String(value));
      });
    });
    setState((s) => ({ ...s, lastCommand: { graphic, input, fields: entries.length, time: new Date().toISOString(), result: real ? 'sent' : 'simulated', command: 'SetText' } }));
    addLog(`SetText → ${graphic} (input "${input}"): ${entries.length} fields ${real ? '' : '· simulated'}`, 'graphic');
    return { ok: true, simulated: !real };
  }, [state.graphicInputMap, state.fieldMap, addLog, connected, enqueue]);

  const takeGraphic = useCallback((graphic, layer = 1) => {
    const input = state.graphicInputMap[graphic];
    if (!input) { addLog(`Cannot take "${graphic}" — no input mapped`, 'warning'); return; }
    const real = connected;
    enqueue(() => { vmixBridge.overlayIn(input, layer); });
    setState((s) => ({ ...s, lastCommand: { graphic, input, time: new Date().toISOString(), result: real ? 'sent' : 'simulated', command: 'OverlayIn' } }));
    addLog(`OverlayIn → ${graphic} (input "${input}")`, 'graphic');
  }, [state.graphicInputMap, addLog, connected, enqueue]);

  const outGraphic = useCallback((graphic, layer = 1) => {
    const input = state.graphicInputMap[graphic];
    if (!input) { addLog(`Cannot out "${graphic}" — no input mapped`, 'warning'); return; }
    const real = connected;
    enqueue(() => { vmixBridge.overlayOut(input, layer); });
    setState((s) => ({ ...s, lastCommand: { graphic, input, time: new Date().toISOString(), result: real ? 'sent' : 'simulated', command: 'OverlayOut' } }));
    addLog(`OverlayOut → ${graphic} (input "${input}")`, 'graphic');
  }, [state.graphicInputMap, addLog, connected, enqueue]);

  const clearAllGraphics = useCallback(() => {
    const inputs = Object.values(state.graphicInputMap || {}).filter(Boolean);
    const real = connected;
    enqueue(() => { inputs.forEach((input) => vmixBridge.overlayOut(input, 1)); });
    setState((s) => ({ ...s, lastCommand: { graphic: 'ALL', time: new Date().toISOString(), result: real ? 'sent' : 'simulated', command: 'OverlayOut (all)' } }));
    addLog('Cleared all graphics (OverlayOut all inputs)', 'warning');
  }, [state.graphicInputMap, addLog, connected, enqueue]);

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
      vmix: vmixBridge,
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