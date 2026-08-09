import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

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
  log: [],
};

export function VmixProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...DEFAULT_STATE, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_STATE;
  });

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [clock, setClock] = useState(new Date());
  const reconnectRef = useRef(null);

  // Persist settings/operator
  useEffect(() => {
    const { settings, operatorName, activeMatchId } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, operatorName, activeMatchId }));
  }, [state.settings, state.operatorName, state.activeMatchId]);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Simulated connection lifecycle (browser cannot open raw TCP; this manages connection state)
  const connect = useCallback(() => {
    setConnecting(true);
    setTimeout(() => {
      setConnected(true);
      setConnecting(false);
      addLog('Connected to vMix', 'success');
    }, 600);
  }, []);

  const disconnect = useCallback(() => {
    setConnected(false);
    setConnecting(false);
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    addLog('Disconnected from vMix', 'warning');
  }, []);

  // Auto reconnect
  useEffect(() => {
    if (!connected && state.settings.autoReconnect && connecting === false && reconnectRef.current === null) {
      // no-op; connection is manual-initiated
    }
  }, [connected, state.settings.autoReconnect]);

  const addLog = useCallback((message, type = 'info') => {
    setState((s) => ({
      ...s,
      log: [{ id: Date.now() + Math.random(), message, type, time: new Date().toISOString() }, ...s.log].slice(0, 200),
    }));
  }, []);

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

  const triggerGraphic = useCallback((graphicName) => {
    addLog(`Graphic triggered: ${graphicName}`, 'graphic');
  }, [addLog]);

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
  };

  return <VmixContext.Provider value={value}>{children}</VmixContext.Provider>;
}

export function useVmix() {
  const ctx = useContext(VmixContext);
  if (!ctx) throw new Error('useVmix must be used within VmixProvider');
  return ctx;
}