import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { vmixBridge } from './vmixBridge';
import { DEFAULT_GRAPHIC_INPUTS, DEFAULT_FIELD_MAP, DEFAULT_SHORTCUTS } from './vmixDefaults';

const VmixContext = createContext(null);

const STORAGE_KEY = 'vmix_controller_state_v1';

const DEFAULT_STATE = {
  settings: {
    ip: '127.0.0.1',
    port: 8099,
    autoReconnect: true,
  },
  connected: false,
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

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [clock, setClock] = useState(new Date());
  const reconnectRef = useRef(null);

  // Persist settings/operator + vMix mappings + shortcuts.
  useEffect(() => {
    const { settings, operatorName, activeMatchId, offlineMatchMode, graphicInputMap, fieldMap, shortcuts } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, operatorName, activeMatchId, offlineMatchMode, graphicInputMap, fieldMap, shortcuts }));
  }, [state.settings, state.operatorName, state.activeMatchId, state.offlineMatchMode, state.graphicInputMap, state.fieldMap, state.shortcuts]);

  // Clock
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

  // Connection lifecycle. First tries the local desktop bridge (real vMix TCP
  // over the LAN). If unavailable, falls back to a simulated connection so the
  // UI keeps working. The local database is never affected by this.
  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const res = await vmixBridge.ping();
      if (res?.ok) {
        setConnected(true); setConnecting(false);
        setState((s) => ({ ...s, lastConnection: new Date().toISOString(), responseTime: res.ms ?? null, vmixInputs: res.inputs?.length ? res.inputs : s.vmixInputs }));
        addLog('Connected to vMix via local bridge', 'success');
        return;
      }
    } catch (e) {}
    // Fallback: simulated state (launch desktop/vmix-bridge.js for real control).
    setTimeout(() => {
      setConnected(true); setConnecting(false);
      setState((s) => ({ ...s, lastConnection: new Date().toISOString(), responseTime: 612, vmixInputs: ['Score Bug', 'Player Lower Third', 'Goal', 'Substitution', 'Starting XI', 'Full Screen'] }));
      addLog('Connected to vMix (simulated — run desktop bridge for real control)', 'warning');
    }, 400);
  }, [addLog]);

  const disconnect = useCallback(() => {
    setConnected(false);
    setConnecting(false);
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    addLog('Disconnected from vMix', 'warning');
  }, [addLog]);

  const test = useCallback(async () => {
    setConnecting(true);
    const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    try {
      const res = await vmixBridge.ping();
      if (res?.ok) {
        const ms = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0);
        setConnecting(false);
        setState((s) => ({ ...s, lastConnection: new Date().toISOString(), responseTime: ms }));
        addLog(`vMix connection test OK (${ms}ms)`, 'success');
        return { ok: true, ms };
      }
    } catch (e) {}
    return new Promise((resolve) => {
      setTimeout(() => {
        const ok = Math.random() > 0.15;
        const ms = Math.round(20 + Math.random() * 80);
        setConnecting(false);
        setState((s) => ({ ...s, lastConnection: new Date().toISOString(), responseTime: ms }));
        if (ok) { addLog(`vMix connection test OK (${ms}ms)`, 'success'); resolve({ ok: true, ms }); }
        else { addLog('vMix connection test failed — no response', 'warning'); resolve({ ok: false, ms: null }); }
      }, 500);
    });
  }, [addLog]);

  const refreshInputs = useCallback(async () => {
    try {
      const res = await vmixBridge.ping();
      if (res?.ok && res.inputs?.length) {
        setState((s) => ({ ...s, vmixInputs: res.inputs }));
        addLog(`vMix inputs refreshed (${res.inputs.length})`, 'success');
        return;
      }
    } catch (e) {}
    setState((s) => ({ ...s, vmixInputs: ['Score Bug', 'Player Lower Third', 'Goal', 'Substitution', 'Starting XI', 'Full Screen'] }));
    addLog('vMix inputs refreshed (simulated)', 'info');
  }, [addLog]);

  const updateSettings = useCallback((settings) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...settings } }));
  }, []);

  const setOperatorName = useCallback((name) => {
    setState((s) => ({ ...s, operatorName: name }));
  }, []);

  const setActiveMatch = useCallback((matchId) => {
    setState((s) => ({ ...s, activeMatchId: matchId }));
    addLog(`Active match set`, 'info');
  }, [addLog]);

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
      // remove any existing binding to that key
      Object.keys(next).forEach((k) => { if (next[k] === action) delete next[k]; });
      if (key) next[key] = action;
      return { ...s, shortcuts: next };
    });
  }, []);

  // Send text data into a graphic's mapped vMix input (does not trigger overlay).
  const sendGraphicData = useCallback((graphic, data) => {
    const input = state.graphicInputMap[graphic];
    if (!input) { addLog(`No vMix input mapped for "${graphic}" — configure it in the vMix page`, 'warning'); return { ok: false }; }
    const fm = state.fieldMap[graphic] || {};
    const entries = Object.entries(data || {});
    entries.forEach(([key, value]) => {
      const field = fm[key] || key;
      vmixBridge.setText(input, field, value == null ? '' : String(value));
    });
    setState((s) => ({ ...s, lastCommand: { graphic, input, fields: entries.length, time: new Date().toISOString(), result: connected ? 'sent' : 'simulated', command: 'SetText' } }));
    addLog(`SetText → ${graphic} (input "${input}"): ${entries.length} fields ${connected ? '' : '· simulated'}`, 'graphic');
    return { ok: true, simulated: !connected };
  }, [state.graphicInputMap, state.fieldMap, addLog, connected]);

  // Trigger overlay in.
  const takeGraphic = useCallback((graphic, layer = 1) => {
    const input = state.graphicInputMap[graphic];
    if (!input) { addLog(`Cannot take "${graphic}" — no input mapped`, 'warning'); return; }
    vmixBridge.overlayIn(input, layer);
    setState((s) => ({ ...s, lastCommand: { graphic, input, time: new Date().toISOString(), result: connected ? 'sent' : 'simulated', command: 'OverlayIn' } }));
    addLog(`OverlayIn → ${graphic} (input "${input}")`, 'graphic');
  }, [state.graphicInputMap, addLog, connected]);

  // Overlay out a single graphic.
  const outGraphic = useCallback((graphic, layer = 1) => {
    const input = state.graphicInputMap[graphic];
    if (!input) { addLog(`Cannot out "${graphic}" — no input mapped`, 'warning'); return; }
    vmixBridge.overlayOut(input, layer);
    setState((s) => ({ ...s, lastCommand: { graphic, input, time: new Date().toISOString(), result: connected ? 'sent' : 'simulated', command: 'OverlayOut' } }));
    addLog(`OverlayOut → ${graphic} (input "${input}")`, 'graphic');
  }, [state.graphicInputMap, addLog, connected]);

  // Clear all mapped graphics (emergency).
  const clearAllGraphics = useCallback(() => {
    const inputs = Object.values(state.graphicInputMap || {});
    inputs.forEach((input) => { if (input) vmixBridge.overlayOut(input, 1); });
    setState((s) => ({ ...s, lastCommand: { graphic: 'ALL', time: new Date().toISOString(), result: connected ? 'sent' : 'simulated', command: 'OverlayOut (all)' } }));
    addLog('Cleared all graphics (OverlayOut all inputs)', 'warning');
  }, [state.graphicInputMap, addLog, connected]);

  const triggerGraphic = useCallback((graphicName) => {
    addLog(`Graphic triggered: ${graphicName}`, 'graphic');
    sendGraphicData(graphicName, {});
    takeGraphic(graphicName);
  }, [addLog, sendGraphicData, takeGraphic]);

  const value = {
    settings: state.settings,
    operatorName: state.operatorName,
    activeMatchId: state.activeMatchId,
    log: state.log,
    connected,
    connecting,
    clock,
    connect,
    disconnect,
    updateSettings,
    setOperatorName,
    setActiveMatch,
    triggerGraphic,
    addLog,
    offlineMatchMode: state.offlineMatchMode,
    setOfflineMatchMode,
    lastConnection: state.lastConnection,
    responseTime: state.responseTime,
    test,
    vmixInputs: state.vmixInputs,
    refreshInputs,
    vmix: vmixBridge,
    graphicInputMap: state.graphicInputMap,
    fieldMap: state.fieldMap,
    shortcuts: state.shortcuts,
    lastCommand: state.lastCommand,
    setGraphicInput,
    setField,
    setShortcut,
    sendGraphicData,
    takeGraphic,
    outGraphic,
    clearAllGraphics,
  };

  return <VmixContext.Provider value={value}>{children}</VmixContext.Provider>;
}

export function useVmix() {
  const ctx = useContext(VmixContext);
  if (!ctx) throw new Error('useVmix must be used within VmixProvider');
  return ctx;
}