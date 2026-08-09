// Offline file helpers — CSV/JSON parsing and downloads that need no internet.

export function downloadBlob(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJSON(filename, data) {
  downloadBlob(filename, JSON.stringify(data, null, 2), 'application/json');
}

export function toCSV(rows, columns) {
  if (!rows || !rows.length) return '';
  const cols = columns || Object.keys(rows[0]);
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const header = cols.join(',');
  const body = rows.map((r) => cols.map((c) => escape(r[c])).join(',')).join('\n');
  return header + '\n' + body;
}

export function downloadCSV(filename, rows, columns) {
  downloadBlob(filename, toCSV(rows, columns), 'text/csv');
}

export function parseCSV(text) {
  const rows = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.length);
  if (!lines.length) return rows;
  const headers = splitCSVLine(lines[0]);
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] !== undefined ? cells[idx] : ''; });
    rows.push(row);
  }
  return rows;
}

function splitCSVLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else {
      if (ch === ',') { out.push(cur); cur = ''; }
      else if (ch === '"') inQ = true;
      else cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export function parseJSON(text) {
  return JSON.parse(text);
}

// Pick only fields that exist on a target schema, coercing numbers/booleans.
export function mapToSchema(rows, schema) {
  const keys = Object.keys(schema.properties || {});
  return rows.map((r) => {
    const o = {};
    keys.forEach((k) => {
      if (r[k] === undefined || r[k] === '') return;
      const t = schema.properties[k]?.type;
      if (t === 'number') o[k] = Number(r[k]);
      else if (t === 'boolean') o[k] = String(r[k]).toLowerCase() === 'true' || r[k] === true;
      else o[k] = String(r[k]);
    });
    return o;
  });
}