import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Pencil, MapPin, User, Building2, CalendarDays, MessageSquare, History, PlusCircle, FileText, Download, Trash2, Plus, ListChecks, RefreshCw, FileDown, ArrowLeft, Paperclip, Eye } from 'lucide-react';
import { api, downloadFile, boqUrl, fmtDate, fmtDateTime, fmtTime } from '../api.js';
import { downloadDailyUpdatesPdf } from '../pdf.js';
import { useLiveApi as useApi } from '../hooks.js';
import { useAuth } from '../auth.jsx';
import { Badge, Loader, ErrorBox, Progress, Empty, Modal, Field } from '../components/ui.jsx';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const KV = ({ k, v }) => (<div><div className="k">{k}</div><div className="v">{v || '—'}</div></div>);
import ProjectForm from '../components/ProjectForm.jsx';
import PhotoGrid from '../components/PhotoGrid.jsx';
import WorkSchedule from '../components/WorkSchedule.jsx';

const STATUSES = ['Not Started', 'Work In Progress', 'On Hold', 'Material Pending', 'Completed', 'Delayed'];
const MATERIAL_CATEGORIES = ['Sheet Material', 'Steel Material', 'Civil Material'];
const MR_PERCENT = { 'Pending Approval': 10, Approved: 30, 'PO Created': 40, Ordered: 50, Processing: 60, Dispatched: 70, 'In Transit': 80, 'Reached Site': 100, Rejected: 0 };
const mrPct = (m) => (m.status === 'Rejected' ? 0 : (MR_PERCENT[m.deliveryStage] != null ? MR_PERCENT[m.deliveryStage] : (MR_PERCENT[m.status] || 0)));

export default function ProjectDetail() {
  const { id } = useParams();
  const { isHead, user } = useAuth();
  const { data, error, loading, reload } = useApi(`/projects/${id}`);
  const [edit, setEdit] = useState(false);
  const [tab, setTab] = useState('updates');
  const [text, setText] = useState('');
  const [showHo, setShowHo] = useState(false);
  if (loading && !data) return <Loader />;
  if (error) return <ErrorBox error={error} />;
  const { project: p, reports, comments, assignmentHistory } = data;

  const changeStatus = async (status) => { await api(`/projects/${p.id}/status`, { method: 'PATCH', body: { status } }); reload(); };
  const downloadAtt = (a) => downloadFile(`/projects/${p.id}/attachments/${a.fileId}?download=1`, a.filename).catch(() => {});
  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await api(`/projects/${p.id}/comments`, { method: 'POST', body: { text } });
    setText(''); reload();
  };
  const withPhotos = reports.filter((r) => r.photos.length);

  return (
    <div>
      <div className="page-head">
        <div>
          <Link to={isHead ? '/projects' : '/'} className="btn ghost sm" style={{ marginBottom: 8 }}><ArrowLeft size={15} /> Back to {isHead ? 'Projects' : 'My Sites'}</Link>
          <h2>{p.name}</h2>
          <div className="meta-row">
            {p.client && <span><Building2 size={14} /> {p.client}</span>}
            {p.location && <span><MapPin size={14} /> {p.location}</span>}
            <span><User size={14} /> {p.engineerName}</span>
          </div>
        </div>
        <div className="head-actions">
          {p.handoverId && <button className="btn ghost" onClick={() => setShowHo(true)}><FileText size={16} /> View Handover Form</button>}
          {!isHead && <Link to={`/submit?project=${p.id}`} className="btn primary"><PlusCircle size={18} /> Submit Update</Link>}
          {isHead && <button className="btn primary" onClick={() => setEdit(true)}><Pencil size={16} /> Edit / Reassign</button>}
        </div>
      </div>

      <div className="grid-detail">
        <section className="panel">
          <div className="kv">
            <div><span>Status</span>
              <select className={`status-select`} value={p.status} onChange={(e) => changeStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              {p.overdue && <div className="small danger mt-xs">Past expected completion date</div>}
            </div>
            <div><span>Priority</span><Badge value={p.priority} /></div>
            <div><span>Total Value</span>{p.projectValue ? inr(p.projectValue) : <span className="muted">—</span>}</div>
            {(p.length > 0 || p.width > 0) && <div><span>Dimensions</span>{p.length || '—'} × {p.width || '—'} {p.unit || 'ft'}</div>}
            <div><span>Progress</span><Progress value={p.progressPercent} /></div>
            <div><span>Start Date</span>{fmtDate(p.startDate)}</div>
            <div><span>Expected Completion</span>{fmtDate(p.expectedDate)}</div>
            <div><span>Total Updates</span>{p.reportCount}</div>
            {p.handoverRef && <div><span>From Sales Handover</span>{p.handoverRef}</div>}
            {p.assignedAt && <div><span>Assigned On</span>{fmtDate(p.assignedAt)}</div>}
          </div>
          <div className="block"><h4>Scope of Work</h4><p className="pre">{p.scope || <span className="muted">Not specified</span>}</p></div>
          <div className="block instructions"><h4>Work Instructions</h4><p className="pre">{p.instructions || <span className="muted">No instructions</span>}</p></div>
          {(p.handoverAttachments?.length > 0) && (
            <div className="block">
              <h4>Handover Attachments</h4>
              {p.handoverAttachments.map((a) => (
                <div className="att" key={a.fileId}>
                  <div className="att-ic"><FileText size={16} /></div>
                  <div className="att-main"><div className="att-name">{a.filename}</div></div>
                  <div className="att-act"><button className="btn ghost xs" onClick={() => downloadAtt(a)}><Download size={14} /> Download</button></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h3><MessageSquare size={18} /> Comments & Instructions</h3></div>
          <div className="comments scroll">
            {comments.length === 0 && <div className="muted small">No comments yet.</div>}
            {comments.map((c) => (
              <div key={c.id} className={`comment ${c.authorRole === 'head' ? 'from-head' : ''}`}>
                <div className="c-head"><strong>{c.authorName}</strong> <span className="muted small">{fmtDateTime(c.createdAt)}</span></div>
                <div>{c.text}</div>
                {c.reportId && <Link className="small link" to={`/reports/${c.reportId}`}>on a daily update</Link>}
              </div>
            ))}
          </div>
          <form className="comment-form" onSubmit={send}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder={isHead ? 'Add instruction for engineer…' : 'Write a reply…'} />
            <button className="btn primary" disabled={!text.trim()}>Send</button>
          </form>
        </section>
      </div>

      <div className="tabs">
        <button className={tab === 'updates' ? 'active' : ''} onClick={() => setTab('updates')}>Daily Updates ({reports.length})</button>
        <button className={tab === 'photos' ? 'active' : ''} onClick={() => setTab('photos')}>Site Photos ({reports.reduce((s, r) => s + r.photos.length, 0)})</button>
        <button className={tab === 'tasks' ? 'active' : ''} onClick={() => setTab('tasks')}>Daily Tasks ({isHead ? (p.dailyTasks || []).length : (p.dailyTasks || []).filter((t) => t.assigneeId === user?.id).length})</button>
        <button className={tab === 'materials' ? 'active' : ''} onClick={() => setTab('materials')}>Materials</button>
        <button className={tab === 'phistory' ? 'active' : ''} onClick={() => setTab('phistory')}>Project History</button>
        {isHead && <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Assignment History</button>}
        {isHead && <button className={tab === 'schedule' ? 'active' : ''} onClick={() => setTab('schedule')}>Work Schedule</button>}
      </div>

      {tab === 'updates' && (reports.length === 0 ? <Empty icon={CalendarDays} title="No daily updates yet" /> : (
        <div className="timeline">
          {reports.map((r) => (
            <Link to={`/reports/${r.id}`} key={r.id} className="tl-item">
              <div className="tl-date"><strong>{fmtDate(r.reportDate)}</strong><span>{fmtTime(r.createdAt)}</span></div>
              <div className="tl-body">
                <div className="tl-top"><span>{r.engineerName}</span><Badge value={r.projectStatus} />{r.progressPercent != null && <span className="chip">{r.progressPercent}%</span>}{r.photos.length > 0 && <span className="chip">📷 {r.photos.length}</span>}</div>
                <div>{r.todayProgress || r.workCompleted}</div>
                {r.tomorrowPlan && <div className="small muted">Tomorrow: {r.tomorrowPlan}</div>}
                {r.materialRequired && <div className="small">Material: {r.materialRequired} <Badge value={r.materialStatus} /></div>}
              </div>
            </Link>
          ))}
        </div>
      ))}

      {tab === 'photos' && (withPhotos.length === 0 ? <Empty title="No site photos yet" /> : withPhotos.map((r) => (
        <div key={r.id} className="panel">
          <div className="panel-head"><h4>{fmtDate(r.reportDate)} · {r.engineerName}</h4><Link to={`/reports/${r.id}`} className="link small">Open update</Link></div>
          <PhotoGrid report={r} small />
        </div>
      )))}

      {tab === 'history' && (
        <div className="panel">
          {assignmentHistory.length === 0 ? <div className="muted">No assignments recorded.</div> : (
            <ul className="list">
              {[...assignmentHistory].reverse().map((h, i) => (
                <li key={i}><span><History size={14} /> Assigned to <strong>{h.engineerName}</strong></span><span className="muted small">{fmtDateTime(h.at)}{h.byName && ` by ${h.byName}`}</span></li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'tasks' && <DailyTasks project={p} isHead={isHead} userId={user?.id} onChanged={reload} />}

      {tab === 'materials' && <Materials project={p} isHead={isHead} userId={user?.id} />}

      {tab === 'phistory' && <ProjectHistory project={p} reports={reports} />}

      {tab === 'schedule' && isHead && <WorkSchedule project={p} onSaved={reload} />}

      {edit && <ProjectForm project={p} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); reload(); }} />}
      {showHo && p.handoverId && <HandoverFormModal handoverId={p.handoverId} onClose={() => setShowHo(false)} />}
    </div>
  );
}

// Date-wise Project History (Phase 3): daily updates grouped by calendar date, newest first,
// with a one-click Daily Updates PDF (whole project or a single day) including site photos.
function ProjectHistory({ project, reports }) {
  const [busy, setBusy] = useState('');   // '' | 'all' | a reportDate
  const [err, setErr] = useState('');

  const groups = useMemo(() => {
    const m = new Map();
    for (const r of reports) { const d = (r.reportDate || '').slice(0, 10); if (!m.has(d)) m.set(d, []); m.get(d).push(r); }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])); // newest date first
  }, [reports]);

  const dl = async (key, list, filename) => {
    setBusy(key); setErr('');
    try { await downloadDailyUpdatesPdf(project, list, filename ? { filename } : undefined); }
    catch (e) { setErr(e.message); } finally { setBusy(''); }
  };

  if (!reports.length) return <Empty icon={CalendarDays} title="No daily updates yet" >The project history builds up as the team submits daily updates.</Empty>;

  return (
    <div className="panel">
      <div className="panel-head">
        <h3><History size={18} /> Project History <span className="muted small">· {reports.length} update(s) over {groups.length} day(s)</span></h3>
        <button className="btn primary sm" disabled={!!busy} onClick={() => dl('all', reports)}>
          <FileDown size={16} /> {busy === 'all' ? 'Preparing…' : 'Download PDF'}
        </button>
      </div>
      <ErrorBox error={err} />
      <div className="history-dates">
        {groups.map(([date, list]) => {
          const photos = list.reduce((s, r) => s + (r.photos?.length || 0), 0);
          return (
            <div className="hist-day" key={date} style={{ marginBottom: 16 }}>
              <div className="panel-head" style={{ borderBottom: '2px solid var(--line, #e2e8f0)', paddingBottom: 6, marginBottom: 8 }}>
                <h4 style={{ margin: 0 }}><CalendarDays size={15} /> {fmtDate(date)} <span className="muted small">· {list.length} update{list.length > 1 ? 's' : ''}{photos ? ` · 📷 ${photos}` : ''}</span></h4>
                <button className="btn ghost xs" disabled={!!busy} onClick={() => dl(date, list, `${(project.name || 'project').replace(/[^\w.-]+/g, '_')}_${date}.pdf`)}>
                  <FileDown size={13} /> {busy === date ? 'Preparing…' : 'PDF'}
                </button>
              </div>
              {list.map((r) => (
                <Link to={`/reports/${r.id}`} key={r.id} className="tl-item" style={{ display: 'block' }}>
                  <div className="tl-body">
                    <div className="tl-top"><span>{r.engineerName}</span><Badge value={r.projectStatus} />{r.progressPercent != null && <span className="chip">{r.progressPercent}%</span>}{r.photos?.length > 0 && <span className="chip">📷 {r.photos.length}</span>}<span className="muted small">{fmtTime(r.createdAt)}</span></div>
                    <div>{r.todayProgress || r.workCompleted || <span className="muted">No written details</span>}</div>
                    {r.tomorrowPlan && <div className="small muted">Tomorrow: {r.tomorrowPlan}</div>}
                    {r.materialRequired && <div className="small">Material: {r.materialRequired} <Badge value={r.materialStatus} /></div>}
                  </div>
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Material Requirements (Phase 4): raise material needs to the Procurement Portal and
// watch the status (Pending Approval → Approved → PO Created / Rejected) come back live.
function Materials({ project, isHead, userId }) {
  const pid = project.id;
  const canRaise = isHead || project.engineerId === userId;
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ material: '', spec: '', qty: '', unit: '', neededBy: '', notes: '', category: '' });
  const [boqFiles, setBoqFiles] = useState([]);

  const load = () => api(`/materials?projectId=${pid}`).then((d) => setList(d.requests || [])).catch((e) => setErr(e.message));
  // Load + poll so Procurement decisions (approve / reject / PO) appear without a manual refresh.
  // (Notifications are cleared from the bell, not here, so opening this tab doesn't wipe them.)
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [pid]); // eslint-disable-line

  const uploadBoq = async (id, files) => {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('files', f, f.name));
    await api(`/materials/${id}/boq`, { method: 'POST', form: fd });
  };
  const raise = async () => {
    if (!form.material.trim()) { setErr('Enter the material / item name'); return; }
    setBusy(true); setErr('');
    try {
      const { request } = await api('/materials', { method: 'POST', body: { projectId: pid, ...form } });
      if (boqFiles.length && request?.id) await uploadBoq(request.id, boqFiles);
      setForm({ material: '', spec: '', qty: '', unit: '', neededBy: '', notes: '', category: '' });
      setBoqFiles([]);
      await load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const addBoqTo = async (m, files) => { if (!files.length) return; setErr(''); try { await uploadBoq(m.id, files); await load(); } catch (e) { setErr(e.message); } };
  const withdraw = async (m) => { if (!window.confirm(`Withdraw the request for "${m.material}"?`)) return; try { await api(`/materials/${m.id}`, { method: 'DELETE' }); await load(); } catch (e) { setErr(e.message); } };

  return (
    <div className="panel">
      <div className="panel-head"><h3><FileText size={18} /> Material Requirements <span className="muted small">· to Procurement</span></h3></div>
      <ErrorBox error={err} />

      {canRaise && (
        <div className="task-add" style={{ display: 'grid', gridTemplateColumns: '1.3fr 2fr 1fr 0.7fr 0.7fr 1fr auto', gap: 8, alignItems: 'end', marginBottom: 14 }}>
          <Field label="Category">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">— Select —</option>
              {MATERIAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Material / item *"><input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} placeholder="e.g. PU insulated roof sheet" /></Field>
          <Field label="Specification"><input value={form.spec} onChange={(e) => setForm({ ...form, spec: e.target.value })} placeholder="e.g. 40mm, Blue" /></Field>
          <Field label="Qty"><input type="number" min="0" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></Field>
          <Field label="Unit"><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="nos / sqft" /></Field>
          <Field label="Needed by"><input type="date" value={form.neededBy} onChange={(e) => setForm({ ...form, neededBy: e.target.value })} /></Field>
          <button className="btn primary" disabled={busy} onClick={raise}><Plus size={16} /> Request</button>
        </div>
      )}
      {canRaise && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'end', marginBottom: 6 }}>
          <Field label="Notes (optional)" full><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any detail for the purchase team" /></Field>
          <Field label="BOQ (Excel / PDF)">
            <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
              <Paperclip size={14} /> {boqFiles.length ? `${boqFiles.length} file(s)` : 'Attach BOQ'}
              <input type="file" accept=".xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple hidden onChange={(e) => setBoqFiles(Array.from(e.target.files || []))} />
            </label>
          </Field>
        </div>
      )}

      {list === null ? <Loader /> : list.length === 0 ? (
        <Empty icon={FileText} title="No material requirements yet" >{canRaise ? 'Raise one above — it goes straight to the Procurement team.' : 'Nothing requested for this project yet.'}</Empty>
      ) : (
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="table">
            <thead><tr><th>Ref</th><th>Category</th><th>Material</th><th className="num">Qty</th><th>Needed by</th><th>BOQ</th><th>Status</th><th>PO</th><th></th></tr></thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  <td className="small muted">{m.ref || '—'}</td>
                  <td>{m.category ? <span className="act-tag">{m.category}</span> : <span className="muted small">—</span>}</td>
                  <td><div style={{ fontWeight: 600 }}>{m.material}</div>{m.spec && <div className="muted small">{m.spec}</div>}{m.status === 'Rejected' && m.rejectReason && <div className="small danger">Rejected: {m.rejectReason}</div>}{m.notes && <div className="muted small">{m.notes}</div>}</td>
                  <td className="num">{m.qty || '—'} {m.unit}</td>
                  <td>{m.neededBy ? fmtDate(m.neededBy) : '—'}</td>
                  <td className="small">
                    {(m.boq || []).map((b) => (
                      <div key={b.fileId} style={{ display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>
                        <a href={boqUrl(m.id, b.fileId)} target="_blank" rel="noopener noreferrer" title={b.filename}><Eye size={13} style={{ verticalAlign: '-2px' }} /> View</a>
                        <a href={boqUrl(m.id, b.fileId, true)} title="Download"><Download size={13} style={{ verticalAlign: '-2px' }} /></a>
                      </div>
                    ))}
                    {canRaise && (isHead || (m.createdBy && m.createdBy.id) === userId) && (
                      <label className="link" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Paperclip size={12} /> Add
                        <input type="file" accept=".xls,.xlsx,application/pdf" multiple hidden onChange={(e) => addBoqTo(m, Array.from(e.target.files || []))} />
                      </label>
                    )}
                    {!(m.boq || []).length && !(canRaise && (isHead || (m.createdBy && m.createdBy.id) === userId)) && <span className="muted">—</span>}
                  </td>
                  <td><Badge value={m.deliveryStage || m.status} />{m.status !== 'Rejected' && <div className="muted small">{mrPct(m)}%{m.deliveryStage === 'Reached Site' ? ' · reached site' : ''}</div>}</td>
                  <td className="small">{m.poRef || '—'}</td>
                  <td>{m.status === 'Pending Approval' && (isHead || (m.createdBy && m.createdBy.id) === userId) && <button className="btn ghost xs danger" onClick={() => withdraw(m)} title="Withdraw"><Trash2 size={14} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TASK_STATUSES = ['To Do', 'In Progress', 'Done'];

// Daily Tasks (Phase 2): the Head assigns tasks to team members; members mark their own done.
function DailyTasks({ project, isHead, userId, onChanged }) {
  const pid = project.id;
  const tasks = project.dailyTasks || [];
  const [engineers, setEngineers] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', assigneeId: '', dueDate: '', details: '' });
  const [reassigning, setReassigning] = useState(null); // taskId currently showing the reassign picker
  const [histFor, setHistFor] = useState(null);

  useEffect(() => { if (isHead) api('/users?role=engineer').then((l) => setEngineers(l.filter((e) => e.active))).catch(() => {}); }, [isHead]);

  const run = async (fn) => { setBusy(true); setErr(''); try { await fn(); onChanged(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  const addTask = () => {
    if (!form.title.trim()) { setErr('Enter a task title'); return; }
    if (!form.assigneeId) { setErr('Choose a team member to assign the task to'); return; }
    run(async () => { await api(`/projects/${pid}/tasks`, { method: 'POST', body: form }); setForm({ title: '', assigneeId: '', dueDate: '', details: '' }); });
  };
  const setStatus = (t, status) => run(async () => { await api(`/projects/${pid}/tasks/${t.id}/status`, { method: 'PATCH', body: { status } }); });
  const reassign = (t, assigneeId) => { if (!assigneeId || assigneeId === t.assigneeId) { setReassigning(null); return; } run(async () => { await api(`/projects/${pid}/tasks/${t.id}/reassign`, { method: 'POST', body: { assigneeId } }); setReassigning(null); }); };
  const del = (t) => { if (!window.confirm(`Delete task "${t.title}"?`)) return; run(async () => { await api(`/projects/${pid}/tasks/${t.id}`, { method: 'DELETE' }); }); };

  const visible = isHead ? tasks : tasks.filter((t) => t.assigneeId === userId);
  const done = tasks.filter((t) => t.status === 'Done').length;

  return (
    <div className="panel">
      <div className="panel-head">
        <h3><ListChecks size={18} /> Daily Tasks {tasks.length > 0 && <span className="muted small">· {done}/{tasks.length} done</span>}</h3>
      </div>
      <ErrorBox error={err} />

      {isHead && (
        <div className="task-add" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'end', marginBottom: 14 }}>
          <Field label="New task"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Complete column footing" /></Field>
          <Field label="Assign to">
            <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
              <option value="">— Select member —</option>
              {engineers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </Field>
          <Field label="Due date"><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
          <button className="btn primary" disabled={busy} onClick={addTask}><Plus size={16} /> Add</button>
        </div>
      )}
      {isHead && (
        <div style={{ marginBottom: 14 }}>
          <Field label="Description (optional)" full><textarea rows={2} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Add any detail or instructions for this task…" /></Field>
        </div>
      )}

      {visible.length === 0 ? (
        <Empty icon={ListChecks} title={isHead ? 'No tasks yet' : 'No tasks assigned to you'} />
      ) : (
        <div className="task-list">
          {visible.map((t) => {
            const mine = t.assigneeId === userId;
            const canStatus = isHead || mine;
            const overdue = t.dueDate && t.status !== 'Done' && t.dueDate < new Date().toISOString().slice(0, 10);
            return (
              <div className="task-row" key={t.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--line, #e2e8f0)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{t.title}</div>
                  {t.details && <div className="small" style={{ color: '#334155', marginTop: 2 }}>{t.details}</div>}
                  <div className="small" style={{ marginTop: 4, color: '#475569' }}>
                    <User size={12} /> <strong style={{ color: '#334155' }}>{t.assigneeName || 'Unassigned'}</strong>
                    {t.dueDate && <> · due {fmtDate(t.dueDate)} {overdue && <Badge value="Overdue" />}</>}
                    {(t.reassignHistory || []).length > 0 && <> · <button className="link small" onClick={() => setHistFor(histFor === t.id ? null : t.id)}>reassigned {t.reassignHistory.length}×</button></>}
                  </div>
                  {histFor === t.id && (
                    <ul className="list small" style={{ marginTop: 6 }}>
                      {t.reassignHistory.map((h, i) => (
                        <li key={i}><span><RefreshCw size={12} /> {h.fromName || 'Unassigned'} → <strong>{h.toName}</strong></span><span className="muted small">{fmtDateTime(h.at)}{h.byName && ` by ${h.byName}`}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {canStatus ? (
                    <select value={t.status} disabled={busy} onChange={(e) => setStatus(t, e.target.value)} className={`status-select b-${t.status === 'Done' ? 'green' : t.status === 'In Progress' ? 'blue' : 'gray'}`}>
                      {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  ) : <Badge value={t.status} />}
                  {isHead && (reassigning === t.id ? (
                    <select autoFocus disabled={busy} defaultValue="" onChange={(e) => reassign(t, e.target.value)} onBlur={() => setReassigning(null)}>
                      <option value="">Move to…</option>
                      {engineers.filter((e) => e.id !== t.assigneeId).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  ) : (
                    <button className="btn ghost xs" disabled={busy} onClick={() => setReassigning(t.id)} title="Reassign"><RefreshCw size={14} /> Reassign</button>
                  ))}
                  {isHead && <button className="btn ghost xs danger" disabled={busy} onClick={() => del(t)} title="Delete"><Trash2 size={14} /></button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Full Sales handover form, shown to the assigned engineer (and Head) for this project.
// Reads the shared handover via the access-scoped /handovers/:id endpoint.
function HandoverFormModal({ handoverId, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api(`/handovers/${handoverId}`).then(setData).catch((e) => setError(e.message)); }, [handoverId]);

  if (error) return <Modal title="Handover Form" onClose={onClose} wide><ErrorBox error={error} /></Modal>;
  if (!data) return <Modal title="Handover Form" onClose={onClose} wide><Loader /></Modal>;
  const h = data.handover;
  const d = h.details || {}, sc = h.scope || {}, tl = h.timeline || {}, pr = h.pricing || {};
  const download = (a) => downloadFile(`/handovers/${handoverId}/attachments/${a.fileId}?download=1`, a.filename).catch((e) => setError(e.message));

  return (
    <Modal title={`${h.ref || 'Handover'} · ${h.projectName || ''}`} onClose={onClose} wide>
      <div className="ho-modal" style={{ paddingBottom: 12 }}>
        <div style={{ marginBottom: 10 }}><Badge value={h.priority || 'Medium'} /> <span className="muted small">from {h.createdBy?.name} · received {fmtDateTime(h.submittedAt)}</span></div>

        <h4>1. Client &amp; Project Details</h4>
        <div className="kv">
          <KV k="Lead ID" v={d.leadId} /><KV k="Client Name" v={d.clientName} />
          <KV k="Project Location" v={d.projectLocation} /><KV k="Contact Details" v={d.contactDetails} />
          <KV k="Billing Name" v={d.billingName} /><KV k="Mobile Number" v={d.mobileNumber} />
          <KV k="Alternate Mobile" v={d.alternateMobile} /><KV k="GST Number" v={d.gstNumber} />
          <KV k="Email / WhatsApp" v={d.emailWhatsapp} /><KV k="Salesperson" v={d.salespersonName} />
          <KV k="Date of Order" v={fmtDate(d.dateOfOrder)} /><KV k="Proposal Ref No" v={d.proposalRefNo} />
          <KV k="Location Map" v={d.mapLink ? <a href={d.mapLink} target="_blank" rel="noreferrer">Open map ↗</a> : '—'} />
          <div className="full"><KV k="Site Address" v={d.siteAddress} /></div>
          <div className="full"><KV k="Billing Address" v={d.billingAddress} /></div>
        </div>

        <h4>2. Scope of Work</h4>
        <div className="kv">
          <KV k="Type of Project" v={sc.typeOfProject} /><KV k="Project Size / Area" v={sc.projectSizeArea} />
          <KV k="Design" v={[sc.design3D && '3D', sc.design2D && '2D'].filter(Boolean).join(' + ') || 'None'} />
          <KV k="Transportation — Client Scope" v={sc.transportationClientScope} />
          <KV k="Scaffolding — Client Scope" v={sc.scaffoldingClientScope} />
        </div>

        <h4>3. Timeline &amp; Delivery</h4>
        <div className="kv">
          <KV k="Tentative Start" v={fmtDate(tl.tentativeStartDate)} /><KV k="Tentative Completion" v={fmtDate(tl.tentativeCompletionDate)} />
          <KV k="Lead Time Promised" v={tl.leadTimePromised} />
        </div>

        <h4>4. Pricing &amp; Payment Terms</h4>
        <div className="kv one"><KV k="Quoted Price" v={inr(pr.quotedPrice)} /></div>
        {(pr.milestones || []).length > 0 && (
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="table"><thead><tr><th>Term / Milestone</th><th className="num">%</th><th className="num">Value (₹)</th></tr></thead>
              <tbody>{pr.milestones.map((m, i) => (<tr key={i}><td>{m.term}</td><td className="num">{m.percentage}</td><td className="num">{inr(m.value)}</td></tr>))}</tbody>
            </table>
          </div>
        )}

        <h4>5 &amp; 6. Confirmations</h4>
        <div className="kv">
          <KV k="Site Engineer Visit" v={h.siteVisitCompleted ? 'Completed' : 'Not completed'} />
          <KV k="Salesperson Declaration" v={h.declarationAccepted ? 'Confirmed' : 'Not confirmed'} />
        </div>

        <h4>Attachments ({(h.attachments || []).length})</h4>
        {(h.attachments || []).length === 0 ? <div className="muted">No attachments.</div> : (h.attachments || []).map((a) => (
          <div className="att" key={a.fileId}>
            <div className="att-ic"><FileText size={16} /></div>
            <div className="att-main"><div className="att-name">{a.filename}</div></div>
            <div className="att-act"><button className="btn ghost xs" onClick={() => download(a)}><Download size={14} /> Download</button></div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
