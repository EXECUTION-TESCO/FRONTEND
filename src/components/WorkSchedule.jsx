import { useMemo, useState } from 'react';
import { Plus, Trash2, Save, Printer, CalendarRange } from 'lucide-react';
import { api } from '../api.js';

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DEFAULT_NOTES = [
  'Schedule is subject to timely site clearance and uninterrupted access to the work area.',
  'Sundays are excluded from the working day count. Duration is calculated on working days only.',
  'All activities are sequential; each activity commences only on completion of the preceding one.',
  'Any delay in material supply, adverse weather, power failure or client-side hold will extend the schedule accordingly.',
  'Safety measures and PPE compliance are mandatory for all personnel throughout the execution period.',
];
const toDate = (s) => { if (!s) return null; const d = new Date(s + 'T00:00:00'); return isNaN(d) ? null : d; };
const fmtDMY = (s) => { const d = toDate(s); return d ? `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}` : ''; };
const wdOf = (s) => { const d = toDate(s); return d ? WD[d.getDay()] : ''; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// Working days between two dates (inclusive), excluding Sundays.
function workingDays(start, end) {
  const a = toDate(start), b = toDate(end);
  if (!a || !b || b < a) return 0;
  let n = 0;
  for (let d = new Date(a); d <= b; d = addDays(d, 1)) if (d.getDay() !== 0) n++;
  return n;
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const blankRow = () => ({ activity: '', description: '', start: '', end: '', remarks: '' });

export default function WorkSchedule({ project, onSaved }) {
  const ws0 = project.workSchedule || {};
  const [f, setF] = useState({
    subtitle: ws0.subtitle || '',
    totalArea: ws0.totalArea || '',
    scheduleRef: ws0.scheduleRef || `TS/WS/${new Date().getFullYear()}/001`,
    dateOfIssue: ws0.dateOfIssue || iso(new Date()),
    revision: ws0.revision || 'R0',
    scopeOfWork: ws0.scopeOfWork || project.scope || '',
    startDate: ws0.startDate || project.startDate || '',
    completion: ws0.completion || '',
    activities: (ws0.activities && ws0.activities.length ? ws0.activities : [blankRow()]).map((a) => ({ ...blankRow(), ...a })),
    notes: ws0.notes && ws0.notes.length ? ws0.notes : [...DEFAULT_NOTES],
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const rows = useMemo(() => f.activities.map((a) => ({ ...a, days: workingDays(a.start, a.end), remarks: a.remarks || (a.start && a.end ? `${wdOf(a.start)} – ${wdOf(a.end)}` : '') })), [f.activities]);
  const totalDays = rows.reduce((s, r) => s + r.days, 0);
  const completion = f.completion || rows.map((r) => r.end).filter(Boolean).sort().slice(-1)[0] || '';
  const startAll = f.startDate || rows.map((r) => r.start).filter(Boolean).sort()[0] || '';

  const setRow = (i, k, v) => setF((s) => ({ ...s, activities: s.activities.map((a, j) => (j === i ? { ...a, [k]: v } : a)) }));
  const addRow = () => setF((s) => ({ ...s, activities: [...s.activities, blankRow()] }));
  const delRow = (i) => setF((s) => ({ ...s, activities: s.activities.length > 1 ? s.activities.filter((_, j) => j !== i) : s.activities }));
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const setNote = (i, v) => setF((s) => ({ ...s, notes: s.notes.map((n, j) => (j === i ? v : n)) }));
  const addNote = () => setF((s) => ({ ...s, notes: [...s.notes, ''] }));
  const delNote = (i) => setF((s) => ({ ...s, notes: s.notes.filter((_, j) => j !== i) }));

  const save = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const payload = { ...f, activities: rows.map(({ activity, description, start, end, days, remarks }) => ({ activity, description, start, end, days, remarks })), notes: f.notes.filter((n) => n.trim()) };
      await api(`/projects/${project.id}/work-schedule`, { method: 'PUT', body: { workSchedule: payload } });
      setMsg('Work schedule saved'); onSaved && onSaved();
    } catch (e) { setErr(e.message || 'Could not save'); } finally { setBusy(false); }
  };

  const print = () => {
    const html = buildHTML(project, f, rows, { totalDays, completion, startAll });
    const w = window.open('', '_blank');
    if (!w) { setErr('Please allow pop-ups to generate the schedule.'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  };

  return (
    <div className="ws">
      {err && <div className="alert error">{err}</div>}
      {msg && <div className="alert success">{msg}</div>}

      <div className="ws-meta">
        <L label="Sub-title (e.g. Fabric Structure — 950 Sq.ft)"><input value={f.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="Structure type — area" /></L>
        <L label="Total Area"><input value={f.totalArea} onChange={(e) => set('totalArea', e.target.value)} placeholder="950 Sq.ft" /></L>
        <L label="Scope of Work"><input value={f.scopeOfWork} onChange={(e) => set('scopeOfWork', e.target.value)} /></L>
        <L label="Schedule Ref"><input value={f.scheduleRef} onChange={(e) => set('scheduleRef', e.target.value)} /></L>
        <L label="Date of Issue"><input type="date" value={f.dateOfIssue} onChange={(e) => set('dateOfIssue', e.target.value)} /></L>
        <L label="Revision"><input value={f.revision} onChange={(e) => set('revision', e.target.value)} /></L>
        <L label="Start Date"><input type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} /></L>
        <L label="Completion (auto from last activity if blank)"><input type="date" value={f.completion} onChange={(e) => set('completion', e.target.value)} /></L>
      </div>

      <div className="section-head"><h4><CalendarRange size={16} /> Schedule of Activities</h4><button className="btn ghost sm" onClick={addRow}><Plus size={14} /> Add activity</button></div>
      <div className="table-wrap">
        <table className="table ws-table">
          <thead><tr><th>#</th><th>Activity</th><th>Description / Scope</th><th>Start</th><th>End</th><th className="num">Days</th><th>Remarks</th><th></th></tr></thead>
          <tbody>
            {rows.map((a, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td><input value={a.activity} onChange={(e) => setRow(i, 'activity', e.target.value)} placeholder="Structure Erection" /></td>
                <td><input value={a.description} onChange={(e) => setRow(i, 'description', e.target.value)} placeholder="Erection, alignment & fixing…" /></td>
                <td><input type="date" value={a.start} onChange={(e) => setRow(i, 'start', e.target.value)} /></td>
                <td><input type="date" value={a.end} onChange={(e) => setRow(i, 'end', e.target.value)} /></td>
                <td className="num"><b>{a.days || '—'}</b></td>
                <td><input value={a.remarks} onChange={(e) => setRow(i, 'remarks', e.target.value)} placeholder={a.start && a.end ? `${wdOf(a.start)} – ${wdOf(a.end)}` : 'auto'} /></td>
                <td><button className="icon-btn" onClick={() => delRow(i)} title="Remove"><Trash2 size={15} /></button></td>
              </tr>
            ))}
            <tr className="ws-total"><td colSpan={5}><b>Total Duration</b></td><td className="num"><b>{totalDays}</b></td><td colSpan={2}>working days</td></tr>
          </tbody>
        </table>
      </div>

      <div className="section-head"><h4>Notes & Conditions</h4><button className="btn ghost sm" onClick={addNote}><Plus size={14} /> Add note</button></div>
      <div className="ws-notes">
        {f.notes.map((n, i) => (
          <div className="ws-note" key={i}><input value={n} onChange={(e) => setNote(i, e.target.value)} /><button className="icon-btn" onClick={() => delNote(i)}><Trash2 size={14} /></button></div>
        ))}
      </div>

      <div className="ws-actions">
        <button className="btn primary" disabled={busy} onClick={save}><Save size={16} /> {busy ? 'Saving…' : 'Save Schedule'}</button>
        <button className="btn" onClick={print}><Printer size={16} /> Download / Print Work Schedule</button>
      </div>
    </div>
  );
}

function L({ label, children }) { return <label className="field"><span className="label">{label}</span>{children}</label>; }

// ── Builds the printable, letterhead-matched Work Schedule document ──
function buildHTML(project, f, rows, { totalDays, completion, startAll }) {
  const origin = window.location.origin;
  const title = `${project.name || 'Project'} — Work Schedule`;
  const info = [
    ['Project Name', project.name || ''], ['Schedule Ref.', f.scheduleRef],
    ['Client', project.client || ''], ['Date of Issue', fmtDMY(f.dateOfIssue)],
    ['Total Area', f.totalArea || ''], ['Revision', f.revision || ''],
    ['Scope of Work', f.scopeOfWork || '', true],
    ['Start Date', startAll ? `${fmtDMY(startAll)} (${wdOf(startAll)})` : ''], ['Completion', completion ? `${fmtDMY(completion)} (${wdOf(completion)})` : ''],
  ];
  // timeline dates
  const starts = rows.map((r) => toDate(r.start)).filter(Boolean);
  const ends = rows.map((r) => toDate(r.end)).filter(Boolean);
  let timeline = '';
  if (starts.length && ends.length) {
    const min = new Date(Math.min(...starts)), max = new Date(Math.max(...ends));
    const dates = [];
    for (let d = new Date(min); d <= max; d = addDays(d, 1)) dates.push(new Date(d));
    const head = dates.map((d) => `<th class="${d.getDay() === 0 ? 'sun' : ''}"><span>${WD[d.getDay()]}</span>${d.getDate()} ${MON[d.getMonth()]}</th>`).join('');
    const body = rows.filter((r) => r.activity || r.start).map((r) => {
      const s = toDate(r.start), e = toDate(r.end);
      const cells = dates.map((d) => {
        const sun = d.getDay() === 0;
        const inRange = s && e && d >= s && d <= e;
        const cls = sun ? 'c-sun' : (inRange ? 'c-work' : '');
        return `<td class="${cls}"></td>`;
      }).join('');
      return `<tr><th>${esc(r.activity || '—')}</th>${cells}</tr>`;
    }).join('');
    timeline = `<div class="sec-title">PROJECT TIMELINE</div>
      <div class="tl-wrap"><table class="tl"><thead><tr><th class="tl-first">ACTIVITY</th>${head}</tr></thead><tbody>${body}</tbody></table></div>
      <div class="legend"><span><i class="lg-work"></i> Working day</span><span><i class="lg-sun"></i> Sunday (non-working)</span></div>`;
  }
  const activityRows = rows.filter((r) => r.activity || r.start).map((r, i) => `<tr>
      <td class="sno">${i + 1}</td><td class="act">${esc(r.activity)}</td><td class="desc">${esc(r.description)}</td>
      <td class="c">${fmtDMY(r.start)}</td><td class="c">${fmtDMY(r.end)}</td><td class="c days">${r.days || ''}</td><td class="rm">${esc(r.remarks)}</td></tr>`).join('');
  const notes = f.notes.filter((n) => n.trim()).map((n) => `<li>${esc(n)}</li>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page{size:A4;margin:14mm 12mm}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2430;font-size:11px;line-height:1.4;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .doc{max-width:760px;margin:0 auto}
  .lh{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #4bb41b;padding-bottom:10px}
  .lh img{height:40px}
  .lh .r{text-align:right}
  .lh .r b{letter-spacing:.32em;font-size:13px;color:#2b3340}
  .lh .r span{display:block;font-style:italic;color:#7a8696;font-size:10px;letter-spacing:.04em}
  .titlebar{background:#555555;color:#fff;padding:12px 16px;margin-top:14px;border-radius:3px}
  .titlebar h1{font-size:16px;letter-spacing:.02em}
  .titlebar div{font-size:10.5px;opacity:.9;margin-top:2px}
  .sec-title{letter-spacing:.28em;font-size:10px;font-weight:700;color:#3b4350;margin:16px 0 7px}
  table{width:100%;border-collapse:collapse}
  .info td{border:1px solid #d9dee6;padding:7px 9px;vertical-align:top}
  .info .k{background:#f2f4f7;font-weight:700;color:#55606f;width:120px;font-size:9.5px;letter-spacing:.02em;text-transform:uppercase}
  .acts th{background:#555555;color:#fff;padding:7px 9px;text-align:left;font-size:9.5px;letter-spacing:.03em;text-transform:uppercase}
  .acts th.r{text-align:right}
  .acts td.c,.acts td.days,.acts td.rm{text-align:right}
  .acts td{border-bottom:1px solid #e6eaf0;padding:7px 9px;vertical-align:top}
  .acts tr:nth-child(even) td{background:#f7f9fb}
  .acts .sno{text-align:center;color:#8893a3}
  .acts .act{font-weight:700}
  .acts .days{font-weight:700;color:#4bb41b}
  .acts .rm{color:#8893a3;font-size:10px}
  .acts .total td{background:#4bb41b;color:#fff;font-weight:700;border:none;padding:8px 9px}
  .acts .total .days{color:#fff}
  .tl-wrap{overflow:hidden}
  .tl{table-layout:fixed}
  .tl th,.tl td{border:1px solid #dde3ea;text-align:center;font-size:7.5px;padding:3px 1px}
  .tl thead th{background:#eef1f5;color:#55606f;line-height:1.25}
  .tl thead th span{display:block;font-weight:700;font-size:7px;color:#8893a3}
  .tl thead th.sun{background:#e4e7ec}
  .tl .tl-first{width:92px;background:#eef1f5}
  .tl tbody th{text-align:left;font-size:8.5px;padding:4px 6px;background:#f7f9fb;color:#333;font-weight:600}
  .tl td.c-work{background:#4bb41b}
  .tl td.c-sun{background:#dfe3e8}
  .legend{display:flex;gap:18px;margin-top:6px;font-size:9px;color:#55606f}
  .legend i{display:inline-block;width:12px;height:10px;border-radius:2px;vertical-align:middle;margin-right:5px}
  .legend .lg-work{background:#4bb41b}.legend .lg-sun{background:#dfe3e8;border:1px solid #cfd5dd}
  .notes li{list-style:none;position:relative;padding-left:16px;margin-bottom:5px;color:#37404d}
  .notes li:before{content:"";position:absolute;left:0;top:4px;width:7px;height:7px;background:#4bb41b;border-radius:2px}
  .foot{display:flex;justify-content:space-between;border-top:1px solid #d9dee6;margin-top:22px;padding-top:9px;color:#8893a3;font-size:9px;line-height:1.5}
  .foot b{color:#55606f}
  @media screen{body{background:#eef1f5;padding:20px}.doc{background:#fff;padding:26px 30px;box-shadow:0 6px 30px rgba(0,0,0,.12)}}
</style></head><body>
<div class="doc">
  <div class="lh"><img src="${origin}/tescologo2.png" alt="Tesco Structures"/><div class="r"><b>WORK SCHEDULE</b><span>Turning vision into reality</span></div></div>
  <div class="titlebar"><h1>${esc(project.name || 'PROJECT')}</h1><div>${esc(f.subtitle || [f.totalArea, 'Project Work Schedule'].filter(Boolean).join(' | '))}</div></div>
  <div class="sec-title">PROJECT INFORMATION</div>
  <table class="info"><tbody>
    <tr><td class="k">Project Name</td><td>${esc(project.name)}</td><td class="k">Schedule Ref.</td><td>${esc(f.scheduleRef)}</td></tr>
    <tr><td class="k">Client</td><td>${esc(project.client)}</td><td class="k">Date of Issue</td><td>${esc(fmtDMY(f.dateOfIssue))}</td></tr>
    <tr><td class="k">Total Area</td><td>${esc(f.totalArea)}</td><td class="k">Revision</td><td>${esc(f.revision)}</td></tr>
    <tr><td class="k">Scope of Work</td><td colspan="3">${esc(f.scopeOfWork)}</td></tr>
    <tr><td class="k">Start Date</td><td>${startAll ? esc(fmtDMY(startAll) + ' (' + wdOf(startAll) + ')') : ''}</td><td class="k">Completion</td><td>${completion ? esc(fmtDMY(completion) + ' (' + wdOf(completion) + ')') : ''}</td></tr>
  </tbody></table>
  <div class="sec-title">SCHEDULE OF ACTIVITIES</div>
  <table class="acts"><thead><tr><th>S.No</th><th>Activity</th><th>Description / Scope</th><th class="r">Start</th><th class="r">End</th><th class="r">Days</th><th class="r">Remarks</th></tr></thead>
    <tbody>${activityRows}<tr class="total"><td colspan="5">TOTAL DURATION</td><td class="days">${totalDays}</td><td>WORKING DAYS</td></tr></tbody></table>
  ${timeline}
  <div class="sec-title">NOTES &amp; CONDITIONS</div>
  <ul class="notes">${notes}</ul>
  <div class="foot">
    <div><b>www.tescostructures.com</b><br>tescostructures@gmail.com</div>
    <div>+91 77088 33911<br>+91 90033 28229</div>
    <div style="text-align:right">37, 15th St, Gandhi Nagar, Ashok Nagar,<br>Chennai, Greater Chennai, Tamil Nadu 600083</div>
  </div>
</div>
<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},350);};</script>
</body></html>`;
}
