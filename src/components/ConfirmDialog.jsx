import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

// Reusable confirmation modal with optional dependency details. Used by the
// delete actions on Teams / Players / Matches (§24) to surface linked-record
// counts before a destructive operation proceeds.
export default function ConfirmDialog({ title = 'Confirm', message, details, confirmLabel = 'Delete', danger = true, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-gradient-to-b from-[#0d0f14] to-black border border-white/10 shadow-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-bold flex items-center gap-2 text-lg"><AlertTriangle size={20} className="text-amber-400" /> {title}</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <p className="text-sm text-slate-300 mb-2">{message}</p>
        {details && <div className="rounded-lg bg-white/5 border border-white/10 p-3 my-3 text-xs text-slate-300 whitespace-pre-line">{details}</div>}
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-sm">Cancel</button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-lg text-sm font-bold ${danger ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'} text-white`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}