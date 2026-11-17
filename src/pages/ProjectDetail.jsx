import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Pencil, MapPin, User, Building2, CalendarDays, MessageSquare, History, PlusCircle } from 'lucide-react';
import { api, fmtDate, fmtDateTime, fmtTime } from '../api.js';
import { useLiveApi as useApi } from '../hooks.js';
import { useAuth } from '../auth.jsx';
import { Badge, Loader, ErrorBox, Progress, Empty } from '../components/ui.jsx';
import ProjectForm from '../components/ProjectForm.jsx';
import PhotoGrid from '../components/PhotoGrid.jsx';
import WorkSchedule from '../components/WorkSchedule.jsx';

const STATUSES = ['Not Started', 'Work In Progress', 'On Hold', 'Material Pending', 'Completed', 'Delayed'];

export default function ProjectDetail() {
  const { id } = useParams();
  const { isHead } = useAuth();
  const { data, error, loading, reload } = useApi(`/projects/${id}`);
  const [edit, setEdit] = useState(false);
  const [tab, setTab] = useState('updates');
  const [text, setText] = useState('');
  if (loading && !data) return <Loader />;
  if (error) return <ErrorBox error={error} />;
  const { project: p, reports, comments, assignmentHistory } = data;

  const changeStatus = async (status) => { await api(`/projects/${p.id}/status`, { method: 'PATCH', body: { status } }); reload(); };
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
          <div className="crumb"><Link to={isHead ? '/projects' : '/'}>{isHead ? 'Projects' : 'My Sites'}</Link> /</div>
          <h2>{p.name}</h2>
          <div className="meta-row">
            {p.client && <span><Building2 size={14} /> {p.client}</span>}
            {p.location && <span><MapPin size={14} /> {p.location}</span>}
            <span><User size={14} /> {p.engineerName}</span>
          </div>
        </div>
        <div className="head-actions">
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
            <div><span>Progress</span><Progress value={p.progressPercent} /></div>
            <div><span>Start Date</span>{fmtDate(p.startDate)}</div>
            <div><span>Expected Completion</span>{fmtDate(p.expectedDate)}</div>
            <div><span>Total Updates</span>{p.reportCount}</div>
          </div>
          <div className="block"><h4>Scope of Work</h4><p className="pre">{p.scope || <span className="muted">Not specified</span>}</p></div>
          <div className="block instructions"><h4>Work Instructions</h4><p className="pre">{p.instructions || <span className="muted">No instructions</span>}</p></div>
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

      {tab === 'schedule' && isHead && <WorkSchedule project={p} onSaved={reload} />}

      {edit && <ProjectForm project={p} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); reload(); }} />}
    </div>
  );
}
