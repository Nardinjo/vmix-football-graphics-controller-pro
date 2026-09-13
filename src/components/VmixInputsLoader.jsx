import React, { useState, useEffect } from 'react';
import { RefreshCw, X, Loader2, ClipboardPaste, CheckCircle2, AlertCircle } from 'lucide-react';

// Modal triggered by "Refresh Inputs". Probes vMix's Web API for its input
// titles: in the desktop app (web security off) it reads them straight away;
// in a browser (CORS blocks the read) it offers a paste box so the operator
// can drop in the titles seen in vMix. Either way the titles populate the
// Graphic → vMix Input Mapping list.
export default function VmixInputsLoader({ open, onClose, refreshInputs, applyVmixTitles, addLog }) {
  const [phase, setPhase] = useState('idle');
  const [result, setResult] = useState(null);
  const [paste, setPaste] = useState('');
  const [applied, setApplied] = useState(0);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setPhase('probing'); setResult(null); setPaste(''); setApplied(0);
    (async () => {
      try {
        const r = await refreshInputs();
        if (alive) setResult(r || { titles: [], readable: false, reachable: false });
      } catch (e) {
        if (alive) setResult({ titles: [], readable: false, reachable: false });
      }
      if (alive) setPhase('done');
    })();
    return () => { alive = false; };
  }, [open, refreshInputs]);

  if (!open) return null;

  const detected = result?.titles || [];

  const applyPaste = () => {
    const list = String(paste || '').split(/[\n,;]+/).map((t) => t.trim()).filter(Boolean);
    if (!list.length) return;
    const mapped = applyVmixTitles(paste);
    setApplied(list.length);
    addLog(`Applied ${list.length} vMix title(s)${mapped ? `, ${mapped} graphic(s) auto-mapped` : ''}`, 'success');
  };

  const reprobe = async () => {
    setPhase('probing'); setResult(null);
    try { setResult(await refreshInputs()); } catch (e) { setResult({ titles: [], readable: false, reachable: false }); }
    setPhase('done');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-[#0d1117] border border-white/10 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><RefreshCw size={16} className="text-blue-400" /> vMix Inputs</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>

        {phase === 'probing' && (
          <div className="flex items-center gap-2 text-sm text-slate-300 py-8 justify-center"><Loader2 size={16} className="animate-spin" /> Reading titles from vMix…</div>
        )}

        {phase === 'done' && detected.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm text-green-400 mb-3"><CheckCircle2 size={15} /> Detected {detected.length} title(s) from vMix</div>
            <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto">
              {detected.map((t, i) => <span key={i} className="text-[11px] px-2 py-1 rounded bg-white/5 text-slate-200 border border-white/10">{t}</span>)}
            </div>
          </div>
        )}

        {phase === 'done' && detected.length === 0 && (
          <div>
            <div className="flex items-start gap-2 text-sm text-amber-300 mb-3">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{result?.reachable ? "vMix is reachable but the browser can't read its title list (CORS). Paste your vMix input titles below — copy them from vMix's Inputs panel." : "vMix is unreachable. Enable vMix → Settings → Web Controller, check the IP/port, then retry."}</span>
            </div>
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste vMix input titles, one per line…" rows={5} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white outline-none focus:border-blue-500 resize-none" />
            {applied > 0 && <div className="text-[11px] text-green-400 mt-2">Applied {applied} title(s) — they now appear in the mapping list.</div>}
            <div className="flex items-center gap-2 mt-3">
              <button onClick={applyPaste} disabled={!paste.trim()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50"><ClipboardPaste size={15} /> Apply titles</button>
              <button onClick={reprobe} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm"><RefreshCw size={15} /> Re-probe</button>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}