import React, { useState, useRef, useEffect } from 'react';
import { entities as localEntities } from '@/lib/dataLayer';
import { useVmix } from '@/lib/vmixContext';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import { parseCSV, parseJSON } from '@/lib/localFile';
import { base44 } from '@/api/base44Client';
import { Upload, FileSpreadsheet, FileJson, FileCode, CheckCircle, AlertCircle, Database, Wifi, Users, Trophy, RotateCw, Link2 } from 'lucide-react';
import { PageHeader } from '@/pages/Matches';

const TARGETS = [
  { id: 'Player', label: 'Player Roster', icon: Users, hint: 'squad number, name, position, age, nationality, team' },
  { id: 'Match', label: 'Match Schedule', icon: Trophy, hint: 'home, away, competition, venue, kickoff date/time' },
  { id: 'Team', label: 'Team Directory', icon: Database, hint: 'name, short name, country, league, colors' },
];

// Common spreadsheet header names → entity fields.
const ALIASES = {
  Player: {
    number: ['number', 'no', '#', 'squad number', 'squad no', 'shirt', 'shirt number', 'jersey'],
    full_name: ['full name', 'name', 'player', 'player name', 'player full name', 'fullname'],
    short_name: ['short name', 'short', 'abbr', 'initials'],
    position: ['position', 'pos', 'role'],
    age: ['age'],
    nationality: ['nationality', 'nat', 'country', 'nation'],
    height: ['height'],
    weight: ['weight'],
    photo_url: ['photo', 'photo url', 'image', 'picture', 'avatar'],
    preferred_foot: ['foot', 'preferred foot', 'preferred foot', 'foot pref'],
    is_captain: ['captain', 'c', 'is captain', 'capt?'],
    is_vice_captain: ['vice captain', 'vc'],
    team: ['team', 'club', 'squad', 'team name', 'team id'],
  },
  Match: {
    competition: ['competition', 'comp', 'tournament', 'league', 'cup', 'event', 'round'],
    home: ['home', 'home team', 'host', 'team1', 'home side', 'home name'],
    away: ['away', 'away team', 'visitor', 'team2', 'away side', 'guest', 'away name'],
    venue: ['venue', 'ground', 'stadium', 'location', 'city'],
    kickoff_time: ['kickoff', 'kickoff time', 'kick off', 'date', 'time', 'start', 'datetime', 'kick off time', 'fixture date'],
    referee: ['referee', 'ref', 'official', 'match official'],
    match_id: ['match id', 'match no', 'fixture id', 'game id', 'id', 'no'],
    weather: ['weather'],
    temperature: ['temperature', 'temp'],
    attendance: ['attendance', 'crowd', 'capacity'],
  },
  Team: {
    name: ['name', 'team', 'club', 'team name', 'teamname'],
    short_name: ['short name', 'short', 'abbr', 'abbreviation', 'code', 'tricode'],
    country: ['country', 'nation', 'nationality'],
    league: ['league', 'competition', 'division', 'confederation'],
    logo_url: ['logo', 'logo url', 'badge', 'crest', 'emblem'],
    primary_color: ['primary color', 'primary colour', 'color', 'colour', 'home color'],
    secondary_color: ['secondary color', 'secondary colour', 'away color', 'accent'],
    coach: ['coach', 'manager', 'head coach', 'gaffer'],
    captain: ['captain'],
  },
};

const NUMBER_FIELDS = { Player: ['number', 'age'], Match: ['attendance', 'home_score', 'away_score', 'current_minute', 'current_half'] };

const POS_MAP = { gk: 'GK', g: 'GK', goalkeeper: 'GK', def: 'DEF', d: 'DEF', defender: 'DEF', cb: 'DEF', lb: 'DEF', rb: 'DEF', mid: 'MID', m: 'MID', midfielder: 'MID', cm: 'MID', dm: 'MID', am: 'MID', fwd: 'FWD', f: 'FWD', forward: 'FWD', striker: 'FWD', st: 'FWD', cf: 'FWD', rw: 'FWD', lw: 'FWD', wing: 'FWD' };
const FOOT_MAP = { l: 'Left', left: 'Left', r: 'Right', right: 'Right', b: 'Both', both: 'Both', either: 'Both' };

const normKey = (k) => String(k || '').toLowerCase().trim().replace(/[\s_\-]+/g, ' ').replace(/[().]/g, '');

function aliasLookup(target, rawKey) {
  const k = normKey(rawKey);
  const map = ALIASES[target];
  for (const [field, aliases] of Object.entries(map)) {
    if (field === k || aliases.includes(k)) return field;
  }
  return null;
}

function mapRow(row, target) {
  const out = {};
  for (const rawKey of Object.keys(row)) {
    const field = aliasLookup(target, rawKey);
    if (field) out[field] = row[rawKey];
  }
  return out;
}

const truthy = (v) => v === true || v === 'true' || v === '1' || v === 1 || String(v).toLowerCase() === 'yes' || String(v).toLowerCase() === 'y';
const toNum = (v) => (v === '' || v == null ? undefined : Number(v));

function coerce(mapped, target) {
  const o = { ...mapped };
  (NUMBER_FIELDS[target] || []).forEach((f) => { if (o[f] !== undefined && o[f] !== '') o[f] = Number(o[f]); });
  if (target === 'Player') {
    if (o.number !== undefined) o.number = toNum(o.number);
    if (o.age !== undefined) o.age = toNum(o.age);
    if (o.position) o.position = POS_MAP[normKey(o.position)] || (['GK', 'DEF', 'MID', 'FWD'].includes(String(o.position).toUpperCase()) ? String(o.position).toUpperCase() : 'MID');
    if (o.preferred_foot) o.preferred_foot = FOOT_MAP[normKey(o.preferred_foot)] || 'Right';
    o.is_captain = !!o.is_captain && truthy(o.is_captain);
    o.is_vice_captain = !!o.is_vice_captain && truthy(o.is_vice_captain);
  }
  if (target === 'Match') {
    if (o.kickoff_time) o.kickoff_time = String(o.kickoff_time).includes('T') ? o.kickoff_time : String(o.kickoff_time).replace(' ', 'T');
    ['attendance'].forEach((f) => { if (o[f] !== undefined) o[f] = toNum(o[f]); });
  }
  return o;
}

// Short name derived from a team name (initials or first 3 letters).
function deriveShort(name) {
  if (!name) return '';
  const words = String(name).split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase();
  return String(name).slice(0, 3).toUpperCase();
}

export default function DataImport() {
  const { addLog } = useVmix();
  const online = useNetworkStatus();
  const [target, setTarget] = useState('Player');
  const [mapped, setMapped] = useState(null); // mapped+coerced preview rows
  const [rawCount, setRawCount] = useState(0);
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState(null);
  const [working, setWorking] = useState(false);
  const teamsRef = useRef(new Map());

  // Load existing teams into a lookup cache for name → id resolution.
  useEffect(() => {
    (async () => {
      try {
        const teams = await localEntities.Team.list();
        const m = new Map();
        teams.forEach((t) => { if (t.name) m.set(t.name.toLowerCase(), t); if (t.short_name) m.set(t.short_name.toLowerCase(), t); });
        teamsRef.current = m;
      } catch (e) {}
    })();
  }, []);

  const resolveOrCreateTeam = async (name) => {
    if (!name) return '';
    const key = String(name).trim().toLowerCase();
    if (!key) return '';
    if (teamsRef.current.has(key)) return teamsRef.current.get(key).id;
    const created = await localEntities.Team.create({ name: String(name).trim(), short_name: deriveShort(name), primary_color: '#1e3a8a', secondary_color: '#ffffff' });
    teamsRef.current.set(key, created);
    teamsRef.current.set(created.short_name?.toLowerCase(), created);
    return created.id;
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWorking(true); setFileName(file.name); setStatus(null); setMapped(null);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const text = await file.text();
      let list = [];

      if (ext === 'json') {
        const parsed = parseJSON(text);
        list = Array.isArray(parsed) ? parsed : (parsed?.items || parsed?.[target.toLowerCase()] || (parsed?.data ? parsed.data[target] : []) || []);
      } else if (ext === 'csv') {
        list = parseCSV(text);
      } else if (ext === 'xml') {
        list = parseXML(text);
      } else if (ext === 'xlsx' || ext === 'xls') {
        if (!online) { setStatus({ type: 'error', msg: 'Excel parsing offline requires the cloud extractor and no internet is available. Save the sheet as CSV instead, then drop it here.' }); setWorking(false); return; }
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const res = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url, json_schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: {} } } } } });
        list = res?.output?.items || [];
      } else {
        setStatus({ type: 'error', msg: 'Unsupported file type. Use CSV (offline), JSON/XML, or Excel (online).' });
        setWorking(false); return;
      }

      const rows = list.map((r) => coerce(mapRow(r, target), target)).filter((r) => Object.keys(r).length);
      setRawCount(list.length);
      setMapped(rows);
      if (!rows.length) { setStatus({ type: 'error', msg: 'No recognizable rows found. Check that column headers match the expected names (see below).' }); }
      else {
        const teamNote = target === 'Player' ? ' Team names will be auto-linked or created.' : target === 'Match' ? ' Home/Away team names will be auto-linked or created.' : '';
        const unmapped = list[0] ? Object.keys(list[0]).filter((k) => !aliasLookup(target, k)) : [];
        const warn = unmapped.length ? ` Unmapped columns ignored: ${unmapped.slice(0, 4).join(', ')}${unmapped.length > 4 ? '…' : ''}.` : '';
        setStatus({ type: 'info', msg: `Mapped ${rows.length} of ${list.length} rows.${teamNote}${warn}` });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: 'Parse failed: ' + (err.message || 'invalid file') });
      setMapped(null);
    }
    setWorking(false);
  };

  const runImport = async () => {
    if (!mapped?.length) { setStatus({ type: 'error', msg: 'No rows to import. Load a file first.' }); return; }
    setWorking(true);
    try {
      let finalRows = mapped;
      if (target === 'Team') {
        finalRows = mapped;
      } else if (target === 'Player') {
        finalRows = [];
        for (const r of mapped) {
          const team_id = r.team_id || (r.team ? await resolveOrCreateTeam(r.team) : '');
          const { team, ...rest } = r;
          finalRows.push({ ...rest, team_id: team_id || '' });
        }
      } else if (target === 'Match') {
        finalRows = [];
        for (const r of mapped) {
          const home_team_id = await resolveOrCreateTeam(r.home);
          const away_team_id = await resolveOrCreateTeam(r.away);
          const { home, away, ...rest } = r;
          finalRows.push({ ...rest, home_team_id, away_team_id, status: r.status || 'scheduled', home_score: 0, away_score: 0, current_half: 1, current_minute: 0, is_active: false });
        }
      }
      const created = await localEntities[target].bulkCreate(finalRows);
      const teamsMade = teamsRef.current.size;
      setStatus({ type: 'success', msg: `Imported ${created.length} ${target} records${target !== 'Team' ? ` · teams resolved/created locally` : ''}.` });
      addLog(`Smart import: ${created.length} ${target} records`, 'success');
      setMapped(null); setFileName(''); setRawCount(0);
    } catch (err) {
      setStatus({ type: 'error', msg: 'Import failed: ' + (err.message || 'unknown error') });
    }
    setWorking(false);
  };

  const reset = () => { setMapped(null); setFileName(''); setStatus(null); setRawCount(0); };

  const expectedCols = {
    Player: 'Squad Number / No, Full Name / Player, Position, Age, Nationality, Team',
    Match: 'Home, Away, Competition, Venue, Kickoff (Date/Time), Referee',
    Team: 'Name, Short Name, Country, League, Primary Color, Coach',
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <PageHeader title="Data Import" subtitle="Drop a spreadsheet to pull player rosters and match schedules — headers auto-mapped, teams auto-linked" />

      <div className={`rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 ${online ? 'bg-green-500/10 text-green-300 border border-green-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'}`}>
        <Wifi size={15} /> {online ? 'Online' : 'Offline'} — CSV is parsed locally in your browser (save Excel as CSV for fully offline import). Excel (.xlsx) uses online extraction.
      </div>

      {/* Quick import presets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TARGETS.map((t) => {
          const Icon = t.icon;
          const active = target === t.id;
          return (
            <button key={t.id} onClick={() => { setTarget(t.id); reset(); }}
              className={`text-left rounded-2xl border p-4 transition-all ${active ? 'bg-blue-600/15 border-blue-500/40' : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={18} className={active ? 'text-blue-400' : 'text-slate-400'} />
                <span className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-200'}`}>{t.label}</span>
              </div>
              <div className="text-[11px] text-slate-500">{t.hint}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        {[{ ext: 'CSV', icon: FileSpreadsheet, desc: 'Offline · best for spreadsheets' }, { ext: 'JSON', icon: FileJson, desc: 'Offline' }, { ext: 'XML', icon: FileCode, desc: 'Offline' }, { ext: 'Excel', icon: FileSpreadsheet, desc: online ? 'Online · .xlsx extract' : 'Offline unsupported' }].map((f) => (
          <div key={f.ext} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
            <f.icon size={24} className="mx-auto text-blue-400 mb-2" />
            <div className="text-sm text-white font-medium">{f.ext}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{f.desc}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-slate-400">Importing into <span className="text-white font-medium">{TARGETS.find((t) => t.id === target)?.label}</span></div>
          <div className="flex items-center gap-1 text-[11px] text-blue-300"><Link2 size={12} /> Teams auto-linked / created by name</div>
        </div>
        <label className="mt-3 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm cursor-pointer border border-dashed border-white/10">
          <Upload size={16} /> {fileName || 'Choose spreadsheet (CSV / JSON / XML / Excel)…'}
          <input type="file" accept=".csv,.xlsx,.xls,.json,.xml" onChange={onFile} className="hidden" disabled={working} />
        </label>

        <div className="flex gap-2 mt-4">
          <button onClick={runImport} disabled={working || !mapped?.length} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50">
            <Database size={16} /> {working ? 'Working…' : `Import ${mapped?.length || 0} ${target === 'Player' ? 'players' : target === 'Match' ? 'matches' : 'teams'}`}
          </button>
          <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm"><RotateCw size={15} /> Reset</button>
        </div>

        {status && (
          <div className={`mt-4 flex items-start gap-2 px-4 py-3 rounded-lg text-sm ${status.type === 'success' ? 'bg-green-500/10 text-green-300 border border-green-500/20' : status.type === 'error' ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'}`}>
            {status.type === 'success' ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />} <span>{status.msg}</span>
          </div>
        )}

        {mapped?.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-slate-500 mb-2">Preview · {mapped.length} rows mapped from {rawCount} parsed</div>
            <div className="overflow-x-auto rounded-lg border border-white/5">
              <table className="w-full text-xs">
                <thead className="bg-white/[0.02] text-slate-500">
                  <tr>{Object.keys(mapped[0]).slice(0, 6).map((k) => <th key={k} className="text-left px-3 py-2 font-medium uppercase tracking-wider">{k}</th>)}<th className="px-3 py-2"></th></tr>
                </thead>
                <tbody>
                  {mapped.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t border-white/5">
                      {Object.keys(mapped[0]).slice(0, 6).map((k) => <td key={k} className="px-3 py-2 text-slate-300 max-w-[160px] truncate">{String(r[k] ?? '')}</td>)}
                      <td className="px-3 py-2 text-slate-600">{i === 0 ? '…' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-5">
        <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-2">Recognized column headers</h3>
        <p className="text-xs text-slate-400">
          For <span className="text-white">{TARGETS.find((t) => t.id === target)?.label}</span>: <code className="text-blue-300">{expectedCols[target]}</code>, plus common variants. Unknown columns are skipped. Records are saved to the local database.
        </p>
      </div>
    </div>
  );
}

// Minimal XML record parser.
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