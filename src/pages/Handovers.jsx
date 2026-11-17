// Execution Portal — Handovers received from the Sales Portal (ADDITIVE page).
// The Execution team views submitted handovers, downloads attachments, and
// Accepts / Rejects / Requests Changes. Shares the same records as the Sales Portal.
import { useEffect, useState } from 'react';
import { FileStack, Search, Download, FileText, MessageSquarePlus, CheckCheck, Paperclip, Bell } from 'lucide-react';
import { api, qs, downloadFile, fmtDate, fmtDateTime } from '../api.js';
import { Modal, Loader, ErrorBox, Empty, Field } from '../components/ui.jsx';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const STATUS_COLOR = { Submitted: 'blue', 'Under Review': 'amber', 'Changes Requested': 'orange', Accepted: 'green', Rejected: 'red', Draft: 'gray' };
const St = ({ value }) => (value ? <span className={`badge b-${STATUS_COLOR[value] || 'gray'}`}>{value}</span> : null);
const FILTERS = ['All', 'Submitted', 'Under Review', 'Changes Requested', 'Accepted', 'Rejected'];
const KV = ({ k, v }) => (<div><div className="k">{k}</div><div className="v">{v || '—'}</div></div>);

export default function Handovers() {
  const [status, setStatus] = useState('All');
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);
  const [notif, setNotif] = useState({ items: [], unread: 0 });

  const loadList = () => {
    setLoading(true);
    api(`/handovers${qs({ status: status === 'All' ? '' : status, q })}`)
      .then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  const loadNotif = () => api('/handovers/notifications').then(setNotif).catch(() => {});
  useEffect(loadList, [status, q]); // eslint-disable-line
  useEffect(() => { loadNotif(); const t = setInterval(loadNotif, 20000); return () => clearInterval(t); }, []);

  const markAllNotif = async () => { await api('/handovers/notifications/read-all', { method: 'POST' }).catch(() => {}); loadNotif(); };
  const list = data?.handovers || [];

  return (
    <div>
      <div className="page-head">
        <div><h2>Handovers {notif.unread > 0 && <span className="badge b-red">{notif.unread} new</span>}</h2><div className="muted">Project handovers received from the Sales team</div></div>
        {notif.unread > 0 && <button className="btn ghost" onClick={markAllNotif}><CheckCheck size={16} /> Mark all read</button>}
      </div>

      {notif.items.filter((n) => !n.read).slice(0, 3).length > 0 && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <ul className="list">
            {notif.items.filter((n) => !n.read).slice(0, 3).map((n) => (
              <li key={n.id}><div><Bell size={14} /> <strong>{n.title}</strong><div className="small muted">{n.message}</div></div></li>
            ))}
          </ul>
        </div>
      )}

      <div className="ho-toolbar">
        <div className="tabs">
          {FILTERS.map((f) => <button key={f} className={status === f ? 'active' : ''} onClick={() => setStatus(f)}>{f}</button>)}
        </div>
        <div className="search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref, project, client…" /></div>
      </div>

      {loading && !data ? <Loader /> : error ? <ErrorBox error={error} /> : list.length === 0 ? (
        <Empty icon={FileStack} title="No handovers found">Handovers submitted by the Sales team will appear here.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table responsive">
            <thead><tr><th>Reference</th><th>Project</th><th>Client</th><th>Value</th><th>From (Sales)</th><th>Status</th><th>Submitted</th></tr></thead>
            <tbody>
              {list.map((h) => (
                <tr key={h.id} className="click" onClick={() => setSel(h.id)}>
                  <td data-label="Reference"><strong>{h.ref || '—'}</strong>{h.attachmentCount > 0 && <span className="chip"><Paperclip size={12} /> {h.attachmentCount}</span>}</td>
                  <td data-label="Project">{h.projectName || '—'}{h.details?.projectLocation && <div className="muted small">{h.details.projectLocation}</div>}</td>
                  <td data-label="Client">{h.clientName || '—'}</td>
                  <td data-label="Value">{inr(h.projectValue)}</td>
                  <td data-label="From (Sales)">{h.createdBy?.name || '—'}</td>
                  <td data-label="Status"><St value={h.status} /></td>
                  <td data-label="Submitted">{fmtDateTime(h.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sel && <HandoverModal id={sel} onClose={() => setSel(null)} onChanged={() => { loadList(); loadNotif(); }} />}
    </div>
  );
}

function HandoverModal({ id, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');
  const load = () => api(`/handovers/${id}`).then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  if (error) return <Modal title="Handover" onClose={onClose} wide><ErrorBox error={error} /></Modal>;
  if (!data) return <Modal title="Handover" onClose={onClose} wide><Loader /></Modal>;
  const h = data.handover;
  const d = h.details || {}, sc = h.scope || {}, tl = h.timeline || {}, pr = h.pricing || {};
  const activity = data.activity || [];
  const canReview = ['Submitted', 'Under Review'].includes(h.status);

  const review = async (action, needReason) => {
    if (needReason && !reason.trim()) { setError(action === 'reject' ? 'Give a reason for rejecting' : 'Describe the changes needed'); return; }
    setBusy(true); setError('');
    try { await api(`/handovers/${id}/review`, { method: 'POST', body: { action, message: reason.trim() } }); setReason(''); await load(); onChanged(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const addComment = async () => {
    if (!comment.trim()) return;
    setBusy(true); setError('');
    try { await api(`/handovers/${id}/comments`, { method: 'POST', body: { message: comment.trim() } }); setComment(''); await load(); onChanged(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const download = (a) => downloadFile(`/handovers/${id}/attachments/${a.fileId}?download=1`, a.filename).catch((e) => setError(e.message));

  return (
    <Modal title={`${h.ref || 'Handover'} · ${h.project?.name || ''}`} onClose={onClose} wide>
      <div className="ho-modal">
        <div style={{ marginBottom: 10 }}><St value={h.status} /> <span className="muted small">from {h.createdBy?.name} · submitted {fmtDateTime(h.submittedAt)}</span></div>
        <ErrorBox error={error} />

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
            <div className="att-main"><div className="att-name">{a.filename}</div><div className="att-meta">{a.uploadedBy || ''}</div></div>
            <div className="att-act"><button className="btn ghost xs" onClick={() => download(a)}><Download size={14} /> Download</button></div>
          </div>
        ))}

        {canReview && (
          <div className="review-box">
            <h4>Review</h4>
            <Field label="Message to Sales (required to reject or request changes)">
              <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason / changes needed…" />
            </Field>
            <div className="row-actions">
              {h.status === 'Submitted' && <button className="btn" disabled={busy} onClick={() => review('start-review')}>Start Review</button>}
              <button className="btn primary" disabled={busy} onClick={() => review('accept')}>Accept</button>
              <button className="btn warn" disabled={busy} onClick={() => review('request-changes', true)}>Request Changes</button>
              <button className="btn danger" disabled={busy} onClick={() => review('reject', true)}>Reject</button>
            </div>
          </div>
        )}

        <h4>History & Comments</h4>
        <div className="comment-box">
          <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment for the Sales team…" />
          <button className="btn ghost sm" disabled={busy || !comment.trim()} onClick={addComment}><MessageSquarePlus size={15} /> Post</button>
        </div>
        <div className="timeline" style={{ marginTop: 12 }}>
          {activity.length === 0 && <div className="muted">No activity yet.</div>}
          {activity.map((a) => (
            <div key={a.id} className={`tl-item ${a.by?.portal === 'execution' ? 'exec' : ''}`}>
              <div className="tl-dot" />
              <div className="tl-body">
                <div className="tl-top">
                  <div className="tl-who">{a.by?.name || 'System'}<span className="side">{a.by?.portal === 'execution' ? 'Execution' : 'Sales'}</span></div>
                  <div className="tl-time">{fmtDateTime(a.createdAt)}</div>
                </div>
                <div className="tl-msg">{a.type === 'status' && a.fromStatus ? <><St value={a.fromStatus} /> → <St value={a.toStatus} /><br /></> : null}{a.message}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
