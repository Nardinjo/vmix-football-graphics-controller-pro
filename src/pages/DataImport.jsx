import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useVmix } from '@/lib/vmixContext';
import { Upload, FileSpreadsheet, FileJson, FileCode, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { PageHeader, Field, Select } from '@/pages/Matches';

const TARGETS = [
  { id: 'Team', label: 'Teams' },
  { id: 'Player', label: 'Players' },
  { id: 'Match', label: 'Matches' },
];

export default function DataImport() {
  const { addLog } = useVmix();
  const [target, setTarget] = useState('Team');
  const [fileUrl, setFileUrl] = useState('');
  const [status, setStatus] = useState(null);
  const [working, setWorking] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWorking(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(file_url);
      setStatus({ type: 'info', msg: `Uploaded ${file.name}. Click Import to extract and insert into ${target}.` });
    } catch (err) {
      setStatus({ type: 'error', msg: 'Upload failed.' });
    }
    setWorking(false);
  };

  const runImport = async () => {
    if (!fileUrl) { setStatus({ type: 'error', msg: 'Upload a file first.' }); return; }
    setWorking(true);
    try {
      const schema = await base44.entities[target].schema();
      const res = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url: fileUrl, json_schema: { type: 'object', properties: { items: { type: 'array', items: schema } } } });
      if (res.status === 'success' && res.output?.items?.length) {
        const created = await base44.entities[target].bulkCreate(res.output.items);
        setStatus({ type: 'success', msg: `Imported ${created.length} ${target} records.` });
        addLog(`Data import: ${created.length} ${target} records`, 'success');
      } else {
        setStatus({ type: 'error', msg: res.details || 'No data extracted. Check file format matches the schema.' });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: 'Import failed: ' + (err.message || 'unknown error') });
    }
    setWorking(false);
  };

  const fmts = [
    { ext: 'CSV', icon: FileSpreadsheet, desc: 'Comma-separated values' },
    { ext: 'Excel', icon: FileSpreadsheet, desc: '.xlsx spreadsheets' },
    { ext: 'JSON', icon: FileJson, desc: 'JavaScript object notation' },
    { ext: 'XML', icon: FileCode, desc: 'Extensible markup' },
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <PageHeader title="Data Import" subtitle="Import teams, players or matches from CSV, Excel, JSON or XML" />

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
            <label className="block text-xs text-slate-400 mb-1.5">File</label>
            <div className="flex gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm cursor-pointer border border-dashed border-white/10">
                <Upload size={16} /> {fileUrl ? 'File uploaded ✓' : 'Choose file...'}
                <input type="file" accept=".csv,.xlsx,.xls,.json,.xml" onChange={onFile} className="hidden" disabled={working} />
              </label>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={runImport} disabled={working || !fileUrl} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50"><Database size={16} /> {working ? 'Working...' : `Import into ${target}`}</button>
          {fileUrl && <button onClick={() => { setFileUrl(''); setStatus(null); }} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm">Reset</button>}
        </div>

        {status && (
          <div className={`mt-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${status.type === 'success' ? 'bg-green-500/10 text-green-300 border border-green-500/20' : status.type === 'error' ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'}`}>
            {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {status.msg}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-5">
        <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-2">Supported: vMix Data Sources</h3>
        <p className="text-xs text-slate-400">Files are parsed against the selected entity schema. Ensure column headers match entity field names (e.g. <code className="text-blue-300">name</code>, <code className="text-blue-300">short_name</code>, <code className="text-blue-300">country</code> for Teams).</p>
      </div>
    </div>
  );
}