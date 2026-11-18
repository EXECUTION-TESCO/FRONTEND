// Execution Portal — Handovers received from the Sales Portal.
// Simple inbox: the Sales team sends a handover, the Execution Head reviews it and
// Accepts (→ a project is created under Projects) or Rejects it. No status tabs, no
// manual project creation here — this screen is only for receiving & reviewing handovers.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileStack, Search, Download, FileText, CheckCheck, Paperclip, Bell, CheckCircle2, XCircle, ArrowRight, Eye } from 'lucide-react';
import { api, qs, downloadFile, fmtDate, fmtDateTime } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Modal, Loader, ErrorBox, Empty, Field, Badge } from '../components/ui.jsx';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const KV = ({ k, v }) => (<div><div className="k">{k}</div><div className="v">{v || '—'}</div></div>);
const isPending = (s) => s === 'Submitted' || s === 'Under Review';

export default function Handovers() {
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);
  const [notif, setNotif] = useState({ items: [], unread: 0 });

  const loadList = () => {
    setLoading(true);
    api(`/handovers${qs({ q })}`)
      .then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  const loadNotif = () => api('/handovers/notifications').then(setNotif).catch(() => {});
  useEffect(loadList, [q]); // eslint-disable-line
  useEffect(() => { loadNotif(); const t = setInterval(loadNotif, 20000); return () => clearInterval(t); }, []);

  const markAllNotif = async () => { await api('/handovers/notifications/read-all', { method: 'POST' }).catch(() => {}); loadNotif(); };
  const list = data?.handovers || [];
  const pendingCount = list.filter((h) => isPending(h.status)).length;

  return (
    <div>
      <div className="page-head">
        <div><h2>Handovers {pendingCount > 0 && <span className="badge b-red">{pendingCount} pending</span>}</h2><div className="muted">Project handovers received from the Sales team</div></div>
        {notif.unread > 0 && <button className="btn ghost" onClick={markAllNotif}><CheckCheck size={16} /> Mark all read</button>}
      </div>

      <div className="ho-toolbar">
        <div className="search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref, project, client…" /></div>
      </div>

      {loading && !data ? <Loader /> : error ? <ErrorBox error={error} /> : list.length === 0 ? (
        <Empty icon={FileStack} title="No handovers found">Handovers sent by the Sales team will appear here.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table responsive">
            <thead><tr><th>Reference</th><th>Project</th><th>Client</th><th>Value</th><th>From (Sales)</th><th>Status</th><th>Received</th><th>Action</th></tr></thead>
            <tbody>
              {list.map((h) => (
                <tr key={h.id} className="click" onClick={() => setSel(h.id)}>
                  <td data-label="Reference"><strong>{h.ref || '—'}</strong>{h.attachmentCount > 0 && <span className="chip"><Paperclip size={12} /> {h.attachmentCount}</span>}</td>
                  <td data-label="Project">{h.projectName || '—'}{h.details?.projectLocation && <div className="muted small">{h.details.projectLocation}</div>}</td>
                  <td data-label="Client">{h.clientName || '—'}</td>
                  <td data-label="Value">{inr(h.projectValue)}</td>
                  <td data-label="From (Sales)">{h.createdBy?.name || '—'}</td>
                  <td data-label="Status"><Badge value={h.status} /></td>
                  <td data-label="Received">{fmtDateTime(h.submittedAt)}</td>
                  <td data-label="Action"><button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setSel(h.id); }}><Eye size={15} /> View</button></td>
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
  const { isHead } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(null); // { status, projectId }
  const load = () => api(`/handovers/${id}`).then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  if (error) return <Modal title="Handover" onClose={onClose} wide><ErrorBox error={error} /></Modal>;
  if (!data) return <Modal title="Handover" onClose={onClose} wide><Loader /></Modal>;
  const h = data.handover;
  const d = h.details || {}, sc = h.scope || {}, tl = h.timeline || {}, pr = h.pricing || {};
  const status = done?.status || h.status;
  const canReview = isHead && isPending(status);

  const review = async (action) => {
    if (action === 'reject' && !reason.trim()) { setError('Please give a reason for rejecting'); return; }
    setBusy(true); setError('');
    try {
      const res = await api(`/handovers/${id}/review`, { method: 'POST', body: { action, message: reason.trim() } });
      setDone({ status: res.handover.status, projectId: res.projectId });
      onChanged();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const download = (a) => downloadFile(`/handovers/${id}/attachments/${a.fileId}?download=1`, a.filename).catch((e) => setError(e.message));

  return (
    <Modal title={`${h.ref || 'Handover'} · ${h.projectName || ''}`} onClose={onClose} wide>
      <div className="ho-modal" style={{ paddingBottom: 18 }}>
        <div style={{ marginBottom: 10 }}><Badge value={status} /> <span className="muted small">from {h.createdBy?.name} · received {fmtDateTime(h.submittedAt)}</span></div>
        <ErrorBox error={error} />

        {done && (
          <div className={`panel ${done.status === 'Accepted' ? 'ok-box' : 'warn-box'}`} style={{ marginBottom: 12 }}>
            {done.status === 'Accepted' ? (
              <div><strong>Handover accepted.</strong> A project has been created under Projects.
                <div style={{ marginTop: 8 }}><button className="btn primary sm" onClick={() => nav(done.projectId ? `/projects/${done.projectId}` : '/projects')}>Open in Projects <ArrowRight size={15} /></button></div>
              </div>
            ) : <div><strong>Handover rejected.</strong> It was not added to active projects.</div>}
          </div>
        )}

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
          <KV k="Length" v={sc.length ? `${sc.length} ${sc.unit || 'ft'}` : '—'} /><KV k="Width" v={sc.width ? `${sc.width} ${sc.unit || 'ft'}` : '—'} />
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

        {canReview && !done && (
          <div className="review-box">
            <h4>Review this handover</h4>
            <Field label="Reason (required only to reject)">
              <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Add a note for the Sales team if rejecting…" />
            </Field>
            <div className="row-actions">
              <button className="btn primary" disabled={busy} onClick={() => review('accept')}><CheckCircle2 size={16} /> Accept &amp; create project</button>
              <button className="btn danger" disabled={busy} onClick={() => review('reject')}><XCircle size={16} /> Reject</button>
            </div>
          </div>
        )}

        {!isHead && isPending(status) && <div className="muted" style={{ marginTop: 12 }}>Only the Execution Head can accept or reject handovers.</div>}
      </div>
    </Modal>
  );
}
