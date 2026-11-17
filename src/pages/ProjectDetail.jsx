import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Pencil, MapPin, User, Building2, CalendarDays, MessageSquare, History, PlusCircle, FileText, Download } from 'lucide-react';
import { api, downloadFile, fmtDate, fmtDateTime, fmtTime } from '../api.js';
import { useLiveApi as useApi } from '../hooks.js';
import { useAuth } from '../auth.jsx';
import { Badge, Loader, ErrorBox, Progress, Empty, Modal } from '../components/ui.jsx';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const KV = ({ k, v }) => (<div><div className="k">{k}</div><div className="v">{v || '—'}</div></div>);
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
          <div className="crumb"><Link to={isHead ? '/projects' : '/'}>{isHead ? 'Projects' : 'My Sites'}</Link> /</div>
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
      {showHo && p.handoverId && <HandoverFormModal handoverId={p.handoverId} onClose={() => setShowHo(false)} />}
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
