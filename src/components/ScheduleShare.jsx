import { useEffect, useState } from 'react';
import { CalendarRange, Send, Trash2, User, FolderKanban } from 'lucide-react';
import { api, fmtDate, fmtDateTime } from '../api.js';
import { Field, Loader, ErrorBox, Empty } from './ui.jsx';

const blank = { projectId: '', assigneeId: '', workDetails: '', startDate: '', expectedCompletionDate: '', instructions: '' };

// One shared-schedule card (used by both the Head history and the member's list).
function ScheduleCard({ s, onDelete }) {
  return (
    <div className="panel" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700 }}><FolderKanban size={14} style={{ verticalAlign: '-2px' }} /> {s.projectName}</div>
          <div className="muted small"><User size={12} style={{ verticalAlign: '-2px' }} /> {s.assigneeName}{s.createdBy?.name ? ` · by ${s.createdBy.name}` : ''} · {fmtDateTime(s.createdAt)}</div>
        </div>
        {onDelete && <button className="btn ghost xs danger" title="Remove" onClick={() => onDelete(s)}><Trash2 size={14} /></button>}
      </div>
      <div className="small" style={{ marginTop: 8 }}><b>Work:</b> {s.workDetails}</div>
      <div className="muted small" style={{ marginTop: 4 }}>
        {s.startDate && <>Start: {fmtDate(s.startDate)} </>}
        {s.expectedCompletionDate && <> · Expected completion: {fmtDate(s.expectedCompletionDate)}</>}
      </div>
      {s.instructions && <div className="small instr" style={{ marginTop: 6 }}>📌 {s.instructions}</div>}
    </div>
  );
}

// Execution Head: create a schedule for a member + date-wise history of all shared schedules.
export function ShareManager({ projects = [] }) {
  const [members, setMembers] = useState([]);
  const [list, setList] = useState(null);
  const [f, setF] = useState(blank);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState('');

  const load = () => api('/work-schedules').then((d) => setList(d.schedules || [])).catch((e) => setErr(e.message));
  useEffect(() => { api('/users').then((u) => setMembers((Array.isArray(u) ? u : []).filter((m) => m.role === 'engineer' && m.active !== false))).catch(() => {}); load(); }, []);

  const share = async () => {
    setErr(''); setOk('');
    if (!f.projectId) return setErr('Select a project');
    if (!f.assigneeId) return setErr('Select a team member');
    if (!f.workDetails.trim()) return setErr('Enter the work details');
    setBusy(true);
    try { await api('/work-schedules', { method: 'POST', body: f }); setF(blank); setOk('Work schedule shared with the team member.'); await load(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const remove = async (s) => { if (!window.confirm('Remove this shared schedule?')) return; try { await api(`/work-schedules/${s.id}`, { method: 'DELETE' }); await load(); } catch (e) { setErr(e.message); } };

  return (
    <div>
      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head"><h3><CalendarRange size={18} /> Share a work schedule with a team member</h3></div>
        <ErrorBox error={err} />
        {ok && <div className="alert success" style={{ marginBottom: 10 }}>{ok}</div>}
        <div className="form-grid">
          <Field label="Project *">
            <select value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })}>
              <option value="">— Select project —</option>
              {[...projects].sort((a, b) => a.name.localeCompare(b.name)).map((p) => <option key={p.id} value={p.id}>{p.name}{p.client ? ` — ${p.client}` : ''}</option>)}
            </select>
          </Field>
          <Field label="Team member *">
            <select value={f.assigneeId} onChange={(e) => setF({ ...f, assigneeId: e.target.value })}>
              <option value="">— Select member —</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.designation ? ` · ${m.designation}` : ''}</option>)}
            </select>
          </Field>
          <Field label="Start date"><input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
          <Field label="Expected completion date"><input type="date" value={f.expectedCompletionDate} onChange={(e) => setF({ ...f, expectedCompletionDate: e.target.value })} /></Field>
          <Field label="Work details *" full><textarea rows={2} value={f.workDetails} onChange={(e) => setF({ ...f, workDetails: e.target.value })} placeholder="What work is scheduled for this member" /></Field>
          <Field label="Instructions" full><textarea rows={2} value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} placeholder="Any instructions for the member" /></Field>
        </div>
        <div className="form-actions"><button className="btn primary" disabled={busy} onClick={share}><Send size={16} /> {busy ? 'Sharing…' : 'Share schedule'}</button></div>
      </section>

      <h3 className="mt-lg">Shared schedule history</h3>
      {list === null ? <Loader /> : list.length === 0 ? (
        <Empty icon={CalendarRange} title="No schedules shared yet">Share a work schedule above — the team member is notified instantly.</Empty>
      ) : list.map((s) => <ScheduleCard key={s.id} s={s} onDelete={remove} />)}
    </div>
  );
}

// Team member: the schedules shared with them (date-wise, newest first).
export function MyShares() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/work-schedules').then((d) => setList(d.schedules || [])).catch((e) => setErr(e.message)); }, []);
  if (err) return null;
  if (list === null || list.length === 0) return null;   // only show the section when there's something
  return (
    <>
      <h3 className="mt-lg"><CalendarRange size={18} style={{ verticalAlign: '-3px' }} /> My Work Schedules</h3>
      {list.map((s) => <ScheduleCard key={s.id} s={s} />)}
    </>
  );
}
