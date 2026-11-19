import { useEffect, useRef, useState } from 'react';
import { Package, History, X } from 'lucide-react';
import { api, fmtDate, fmtDateTime } from '../api.js';
import { Badge, Loader, ErrorBox, Empty, Modal } from '../components/ui.jsx';

const FILTERS = ['', 'Pending Approval', 'Approved', 'PO Created', 'Rejected'];

// Execution Head dashboard — track every material request raised to Procurement,
// with its current status, the Purchase Manager's rejection reason, and full history.
export default function MaterialRequests() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [status, setStatus] = useState('');
  const [history, setHistory] = useState(null);
  const first = useRef(true);

  const load = () => {
    api('/materials').then((d) => setRows(d.requests || [])).catch((e) => setErr(e.message)).finally(() => { first.current = false; });
  };
  // Load + poll so Procurement decisions appear without a manual refresh. Clear the bell.
  useEffect(() => {
    load(); api('/materials/seen', { method: 'PATCH' }).catch(() => {});
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const count = (s) => (rows || []).filter((r) => r.status === s).length;
  const shown = (rows || []).filter((r) => !status || r.status === status);

  return (
    <div>
      <div className="page-head">
        <div><h2>Material Requests</h2><div className="muted">Every requirement raised to Procurement and its current status</div></div>
      </div>

      <div className="filters">
        {FILTERS.map((s) => (
          <button key={s || 'all'} className={`chip ${status === s ? 'on' : ''}`} onClick={() => setStatus(s)} style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid #e2e8f0', background: status === s ? '#1e1b4b' : '#fff', color: status === s ? '#fff' : '#334155', cursor: 'pointer', fontSize: 13 }}>
            {s || 'All'}{s && ` (${count(s)})`}
          </button>
        ))}
      </div>

      <ErrorBox error={err} />
      {rows === null && first.current ? <Loader /> : shown.length === 0 ? (
        <Empty icon={Package} title={status ? `No ${status} requests` : 'No material requests yet'}>Raise requirements from any project's Materials tab.</Empty>
      ) : (
        <div className="panel no-pad">
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>Ref</th><th>Project</th><th>Material</th><th>Qty</th><th>Requested</th><th>Status</th><th>PO</th><th></th></tr></thead>
              <tbody>
                {shown.map((m) => (
                  <tr key={m.id}>
                    <td data-label="Ref" className="small muted">{m.ref || '—'}</td>
                    <td data-label="Project">{m.projectName}{m.handoverRef && <div className="muted small">{m.handoverRef}</div>}</td>
                    <td data-label="Material"><strong>{m.material}</strong>{m.spec && <div className="muted small">{m.spec}</div>}{m.status === 'Rejected' && m.rejectReason && <div className="small danger">Rejected: {m.rejectReason}</div>}</td>
                    <td data-label="Qty">{m.qty || '—'} {m.unit}</td>
                    <td data-label="Requested" className="small">{fmtDate(m.createdAt)}<div className="muted">{m.createdBy?.name}</div></td>
                    <td data-label="Status"><Badge value={m.status} /></td>
                    <td data-label="PO" className="small">{m.poRef || '—'}</td>
                    <td data-label=""><button className="btn ghost sm" onClick={() => setHistory(m)}><History size={14} /> History</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {history && (
        <Modal title={`${history.ref || 'Request'} · ${history.material}`} onClose={() => setHistory(null)}>
          <div className="muted small" style={{ marginBottom: 10 }}>{history.projectName} · Qty {history.qty || '—'} {history.unit} · <Badge value={history.status} /></div>
          {history.status === 'Rejected' && history.rejectReason && <div className="alert error" style={{ marginBottom: 10 }}>Rejection reason: {history.rejectReason}</div>}
          {history.poRef && <div className="alert success" style={{ marginBottom: 10 }}>Purchase Order: {history.poRef}</div>}
          <div className="timeline">
            {(history.statusLog || []).map((l, i) => (
              <div key={i} className="tl-item">
                <div className="tl-dot" />
                <div className="tl-body">
                  <div className="tl-top">
                    <div className="tl-who"><Badge value={l.to} /><span className="side">{l.portal === 'procurement' ? 'Procurement' : 'Execution'}</span></div>
                    <div className="tl-time">{fmtDateTime(l.at)}</div>
                  </div>
                  <div className="tl-msg">{l.note || `by ${l.by}`}</div>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
