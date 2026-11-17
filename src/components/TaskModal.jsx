import { useRef, useState } from 'react';
import { Paperclip, Download, FileText, Pencil } from 'lucide-react';
import { api, downloadFile, fmtDate, fmtDateTime } from '../api.js';
import { Modal, Field, ErrorBox, Badge } from './ui.jsx';

const MEMBER_STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Completed'];
const KV = ({ k, v }) => (<div><div className="k">{k}</div><div className="v">{v || '—'}</div></div>);
const AttRow = ({ a, onDl }) => (
  <div className="att" key={a.fileId}>
    <div className="att-ic"><FileText size={16} /></div>
    <div className="att-main"><div className="att-name">{a.filename}</div><div className="att-meta">{a.uploadedByName || ''}</div></div>
    <div className="att-act"><button className="btn ghost xs" onClick={onDl}><Download size={14} /> Download</button></div>
  </div>
);

// Task detail + actions. Role-aware: the assigned member updates progress; the Head reviews/approves.
export default function TaskModal({ task: t0, isHead, onClose, onChanged, onEdit }) {
  const [t, setT] = useState(t0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [remark, setRemark] = useState('');
  const [completion, setCompletion] = useState('');
  const [delay, setDelay] = useState('');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [extReason, setExtReason] = useState('');
  const [extUntil, setExtUntil] = useState('');
  const fileRef = useRef(null);

  const mine = !isHead; // the viewer is the assigned team member
  const refs = (t.attachments || []).filter((a) => a.kind === 'reference');
  const prog = (t.attachments || []).filter((a) => a.kind === 'progress');

  const run = async (fn) => { setBusy(true); setErr(''); try { const nt = await fn(); if (nt) { setT(nt); onChanged && onChanged(); } } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  const setStatus = (status) => run(() => api(`/tasks/${t.id}/status`, { method: 'PATCH', body: { status, completionDetails: completion, delayReason: delay } }));
  const addRemark = () => { if (!remark.trim()) return; run(async () => { const nt = await api(`/tasks/${t.id}/remarks`, { method: 'POST', body: { message: remark.trim() } }); setRemark(''); return nt; }); };
  const requestExt = () => { if (!extReason.trim()) return; run(async () => { const nt = await api(`/tasks/${t.id}/extension`, { method: 'POST', body: { reason: extReason.trim(), until: extUntil } }); setExtReason(''); setExtUntil(''); return nt; }); };
  const review = (action) => run(() => api(`/tasks/${t.id}/review`, { method: 'POST', body: { action, remarks: reviewRemarks.trim() } }));
  const extDecision = (action) => run(() => api(`/tasks/${t.id}/extension-decision`, { method: 'POST', body: { action, until: t.extensionUntil } }));
  const upload = (e) => {
    const files = [...(e.target.files || [])]; if (fileRef.current) fileRef.current.value = '';
    if (!files.length) return;
    run(() => { const form = new FormData(); files.forEach((f) => form.append('files', f)); return api(`/tasks/${t.id}/attachments`, { method: 'POST', form }); });
  };
  const download = (a) => downloadFile(`/tasks/${t.id}/attachments/${a.fileId}?download=1`, a.filename).catch((e) => setErr(e.message));

  return (
    <Modal title={t.title} onClose={onClose} wide>
      <div className="task-modal" style={{ paddingBottom: 12 }}>
        <ErrorBox error={err} />
        <div className="task-top">
          <Badge value={t.status} />
          {t.approvalState === 'pending' && <span className="badge b-amber">Pending approval</span>}
          <Badge value={t.priority} />
          {t.overdue && <span className="badge b-red">Overdue</span>}
          {t.dueToday && <span className="badge b-amber">Due today</span>}
          <span className="muted small">{t.projectName}</span>
          {isHead && <button className="btn ghost xs" style={{ marginLeft: 'auto' }} onClick={() => onEdit(t)}><Pencil size={13} /> Edit / Reschedule</button>}
        </div>

        <div className="kv">
          <KV k="Assigned To" v={`${t.engineerName}${t.engineerPhone ? ` · ${t.engineerPhone}` : ''}`} />
          <KV k="Start Date" v={fmtDate(t.startDate)} />
          <KV k="Deadline" v={fmtDate(t.endDate)} />
          <KV k="Assigned On" v={t.assignedAt ? fmtDateTime(t.assignedAt) : '—'} />
        </div>
        {t.description && <div className="block"><h4>Description</h4><p className="pre">{t.description}</p></div>}
        {t.instructions && <div className="block"><h4>Instructions</h4><p className="pre">{t.instructions}</p></div>}
        {(t.dependsOn || []).length > 0 && <div className="muted small" style={{ marginTop: 6 }}>Depends on {t.dependsOn.length} task(s) completing first.</div>}

        {t.approvalState === 'changes' && t.reviewRemarks && <div className="alert warn-box" style={{ marginTop: 10 }}><strong>Changes requested:</strong> {t.reviewRemarks}</div>}

        <h4>Reference Attachments ({refs.length})</h4>
        {refs.length === 0 ? <div className="muted">None.</div> : refs.map((a) => <AttRow key={a.fileId} a={a} onDl={() => download(a)} />)}
        {isHead && (<>
          <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={upload} />
          <button className="btn ghost sm mt" disabled={busy} onClick={() => fileRef.current?.click()}><Paperclip size={14} /> Add reference files</button>
        </>)}

        <h4>Progress Files ({prog.length})</h4>
        {prog.length === 0 ? <div className="muted">None.</div> : prog.map((a) => <AttRow key={a.fileId} a={a} onDl={() => download(a)} />)}

        {/* ---- Member actions ---- */}
        {mine && (
          <div className="task-box">
            <h4>Update Status</h4>
            <div className="row-actions wrap">
              {MEMBER_STATUSES.map((s) => <button key={s} className={`btn sm ${t.status === s ? 'primary' : ''}`} disabled={busy} onClick={() => setStatus(s)}>{s}</button>)}
            </div>
            <Field label="Completion details (fill before marking Completed)"><textarea rows={2} value={completion} onChange={(e) => setCompletion(e.target.value)} placeholder="What was completed…" /></Field>
            <Field label="Reason for delay / on hold"><input value={delay} onChange={(e) => setDelay(e.target.value)} placeholder="Optional" /></Field>
            <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={upload} />
            <button className="btn ghost sm" disabled={busy} onClick={() => fileRef.current?.click()}><Paperclip size={14} /> Upload progress files</button>
            <div className="ext-box">
              <Field label="Request a deadline extension"><input value={extReason} onChange={(e) => setExtReason(e.target.value)} placeholder="Reason for extension" /></Field>
              <div className="ext-row"><input type="date" value={extUntil} onChange={(e) => setExtUntil(e.target.value)} /><button className="btn warn sm" disabled={busy || !extReason.trim()} onClick={requestExt}>Request Extension</button></div>
            </div>
          </div>
        )}

        {/* ---- Head: review submitted work ---- */}
        {isHead && t.approvalState === 'pending' && (
          <div className="task-box">
            <h4>Review Submitted Work</h4>
            {t.completionDetails && <div className="muted small" style={{ marginBottom: 6 }}>Completion: {t.completionDetails}</div>}
            <Field label="Remarks (required to request changes)"><textarea rows={2} value={reviewRemarks} onChange={(e) => setReviewRemarks(e.target.value)} /></Field>
            <div className="row-actions"><button className="btn primary sm" disabled={busy} onClick={() => review('approve')}>Approve</button><button className="btn warn sm" disabled={busy} onClick={() => review('request-changes')}>Request Changes</button></div>
          </div>
        )}

        {/* ---- Head: extension request ---- */}
        {isHead && t.extensionRequested && (
          <div className="alert warn-box" style={{ marginTop: 10 }}>
            <strong>Extension requested{t.extensionUntil ? ` until ${fmtDate(t.extensionUntil)}` : ''}:</strong> {t.extensionReason}
            <div className="row-actions" style={{ marginTop: 8 }}><button className="btn primary sm" disabled={busy} onClick={() => extDecision('grant')}>Grant</button><button className="btn ghost sm" disabled={busy} onClick={() => extDecision('deny')}>Decline</button></div>
          </div>
        )}

        <h4>Progress Remarks</h4>
        <div className="comment-box"><textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Add a remark…" /><button className="btn ghost sm" disabled={busy || !remark.trim()} onClick={addRemark}>Post</button></div>

        <h4>History</h4>
        <div className="timeline">
          {(t.history || []).length === 0 && <div className="muted">No history yet.</div>}
          {(t.history || []).slice().reverse().map((h, i) => (
            <div key={i} className={`tl-item ${h.byRole === 'head' ? 'exec' : ''}`}>
              <div className="tl-dot" />
              <div className="tl-body">
                <div className="tl-top"><div className="tl-who">{h.byName || 'System'}<span className="side">{h.byRole === 'head' ? 'Head' : 'Team'}</span></div><div className="tl-time">{fmtDateTime(h.at)}</div></div>
                <div className="tl-msg">{h.message}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
