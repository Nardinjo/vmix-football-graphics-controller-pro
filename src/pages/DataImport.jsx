import React, { useState } from 'react';
import { entities as localEntities } from '@/lib/dataLayer';
import { useVmix } from '@/lib/vmixContext';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import { parseCSV, parseJSON, mapToSchema } from '@/lib/localFile';
import { base44 } from '@/api/base44Client';
import { Upload, FileSpreadsheet, FileJson, FileCode, CheckCircle, AlertCircle, Database, Wifi } from 'lucide-react';
import { PageHeader, Field, Select } from '@/pages/Matches';

const TARGETS = [
  { id: 'Team', label: 'Teams' },
  { id: 'Player', label: 'Players' },
  { id: 'Match', label: 'Matches' },
];

const SCHEMA_HINTS = {
  Team: ['name', 'short_name', 'country', 'league', 'coach', 'captain', 'primary_color', 'secondary_color'],
  Player: ['number', 'full_name', 'short_name', 'position', 'age', 'nationality', 'team_id', 'is_captain'],
  Match: ['home_team_id', 'away_team_id', 'competition', 'venue', 'kickoff_time', 'referee'],
};

const NUMBER_FIELDS = { Player: ['number', 'age'], Match: ['attendance', 'home_score', 'away_score', 'current_minute', 'current_half'] };

export default function DataImport() {
  const { addLog } = useVmix();
  const online = useNetworkStatus();
  const [target, setTarget] = useState('Team');
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState(null);
  const [working, setWorking] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWorking(true);
    setFileName(file.name);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const text = await file.text();

      if (ext === 'json') {
        const parsed = parseJSON(text);
        const list = Array.isArray(parsed) ? parsed : parsed.items || parsed[target.toLowerCase()] || (parsed.data ? parsed.data[target] : []) || [];
        setRows(coerce(list));
        setStatus({ type: 'info', msg: `Parsed ${list.length} rows from JSON. Click Import to save into ${target}.` });
      } else if (ext === 'csv') {
        const list = parseCSV(text);
        setRows(coerce(list));
        setStatus({ type: 'info', msg: `Parsed ${list.length} rows from CSV. Click Import to save into ${target}.` });
      } else if (ext === 'xml') {
        const list = parseXML(text);
        setRows(coerce(list));
        setStatus({ type: 'info', msg: `Parsed ${list.length} rows from XML. Click Import to save into ${target}.` });
      } else if (ext === 'xlsx' || ext === 'xls') {
        if (!online) { setStatus({ type: 'error', msg: 'Excel parsing offline requires the cloud extractor and no internet is available. Use CSV or JSON instead.' }); setRows(null); }
        else {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          const res = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url, json_schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: {} } } } } });
          const list = res?.output?.items || [];
          setRows(coerce(list));
          setStatus({ type: 'info', msg: `Extracted ${list.length} rows from Excel (online). Click Import to save into ${target}.` });
        }
      } else {
        setStatus({ type: 'error', msg: 'Unsupported file type. Use CSV, JSON or XML (offline) or Excel (online).' });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: 'Parse failed: ' + (err.message || 'invalid file') });
      setRows(null);
    }
    setWorking(false);
  };

  const coerce = (list) => {
    const numFields = NUMBER_FIELDS[target] || [];
    return list.map((r) => {
      const o = { ...r };
      numFields.forEach((f) => { if (o[f] !== undefined && o[f] !== '') o[f] = Number(o[f]); });
      if (target === 'Player' && o.is_captain) o.is_captain = String(o.is_captain).toLowerCase() === 'true' || o.is_captain === true;
      return o;
    });
  };

  const runImport = async () => {
    if (!rows || !rows.length) { setStatus({ type: 'error', msg: 'No rows to import. Choose a file first.' }); return; }
    setWorking(true);
    try {
      const created = await localEntities[target].bulkCreate(rows);
      setStatus({ type: 'success', msg: `Imported ${created.length} ${target} records into the local database.` });
      addLog(`Offline import: ${created.length} ${target} records`, 'success');
      setRows(null); setFileName('');
    } catch (err) {
      setStatus({ type: 'error', msg: 'Import failed: ' + (err.message || 'unknown error') });
    }
    setWorking(false);
  };

  const fmts = [
    { ext: 'CSV', icon: FileSpreadsheet, desc: 'Offline · comma-separated' },
    { ext: 'JSON', icon: FileJson, desc: 'Offline · object notation' },
    { ext: 'XML', icon: FileCode, desc: 'Offline · simple records' },
    { ext: 'Excel', icon: FileSpreadsheet, desc: online ? 'Online · .xlsx cloud extract' : 'Offline unsupported' },
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <PageHeader title="Data Import" subtitle="Import teams, players or matches from local files — works offline (USB / disk)" />

      <div className={`rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 ${online ? 'bg-green-500/10 text-green-300 border border-green-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'}`}>
        <Wifi size={15} /> {online ? 'Online' : 'Offline'} — CSV, JSON and XML are parsed locally in your browser. {online ? 'Excel uses cloud extraction.' : 'Excel requires internet; use CSV/JSON.'}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {fmts.map((f) => (
          <div key={f.ext} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-center">
            <f.icon size={26} className="mx-auto text-blue-400 mb-2" />
            <div className="text-sm text-white font-medium">{f.ext}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{f.desc}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="sm:col-span-1">
            <Field label="Import Target">
              <Select value={target} onChange={setTarget} options={TARGETS} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-400 mb-1.5">File (from USB or disk)</label>
            <div className="flex gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm cursor-pointer border border-dashed border-white/10">
                <Upload size={16} /> {fileName || 'Choose file...'}
                <input type="file" accept=".csv,.xlsx,.xls,.json,.xml" onChange={onFile} className="hidden" disabled={working} />
              </label>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={runImport} disabled={working || !rows?.length} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50"><Database size={16} /> {working ? 'Working...' : `Import into ${target}`}</button>
          {(rows || fileName) && <button onClick={() => { setRows(null); setFileName(''); setStatus(null); }} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm">Reset</button>}
        </div>

        {status && (
          <div className={`mt-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${status.type === 'success' ? 'bg-green-500/10 text-green-300 border border-green-500/20' : status.type === 'error' ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'}`}>
            {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {status.msg}
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="mt-4 text-xs text-slate-500">
            Preview: <span className="text-slate-300">{rows.length}</span> rows · first row fields: <code className="text-blue-300">{Object.keys(rows[0]).slice(0, 6).join(', ')}</code>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-5">
        <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-2">Expected columns</h3>
        <p className="text-xs text-slate-400">
          {target}: <code className="text-blue-300">{SCHEMA_HINTS[target].join(', ')}</code>. Ensure file headers match these field names. Records are saved to the local IndexedDB database.
        </p>
      </div>
    </div>
  );
}

// Minimal XML record parser: each direct child element of the root is a record,
// its child elements are field/value pairs.
function parseXML(text) {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const root = doc.documentElement;
  const records = [];
  Array.from(root.children).forEach((rec) => {
    const obj = {};
    Array.from(rec.children).forEach((c) => { obj[c.tagName] = c.textContent; });
    if (Object.keys(obj).length) records.push(obj);
  });
  return records;
}