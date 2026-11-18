import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, User, Building2, CalendarDays, MessageSquare, ArrowRight, FileDown } from 'lucide-react';
import { api, fmtDate, fmtDateTime, fmtTime } from '../api.js';
import { downloadDailyUpdatesPdf } from '../pdf.js';
import { useAuth } from '../auth.jsx';
import { Badge, Progress } from './ui.jsx';
import PhotoGrid, { DownloadAll } from './PhotoGrid.jsx';

const ROWS = [
  ['todayProgress', "Today's Work Progress"],
  ['workCompleted', 'Work Completed Today'],
  ['tomorrowPlan', "Tomorrow's Work Plan"],
  ['materialRequired', 'Material Required'],
  ['issues', 'Issues or Challenges'],
  ['remarks', 'Additional Remarks'],
];

export default function ReportView({ data, onChange }) {
  const { isHead } = useAuth();
  const { report: r, previous: prev, comments } = data;
  const [compare, setCompare] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfErr, setPdfErr] = useState('');

  const downloadPdf = async () => {
    setPdfBusy(true); setPdfErr('');
    try {
      const proj = data.project || {};
      await downloadDailyUpdatesPdf(
        { name: r.projectName, client: proj.client || r.client || '', location: proj.location || r.siteLocation || '', handoverRef: proj.handoverRef || '' },
        [r],
        { filename: `${(r.projectName || 'update').replace(/[^\w.-]+/g, '_')}_${(r.reportDate || '').slice(0, 10)}.pdf` },
      );
    } catch (e) { setPdfErr(e.message); } finally { setPdfBusy(false); }
  };

  const setMaterial = async (materialStatus) => {
    await api(`/reports/${r.id}/material`, { method: 'PATCH', body: { materialStatus } });
    onChange?.();
  };
  const addComment = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try { await api(`/projects/${r.projectId}/comments`, { method: 'POST', body: { text, reportId: r.id } }); setText(''); onChange?.(); }
    finally { setBusy(false); }
  };

  return (
    <div className="report-view">
      <div className="rv-head">
        <div>
          <Link to={`/projects/${r.projectId}`} className="rv-title">{r.projectName}</Link>
          <div className="meta-row">
            <span><User size={14} /> {r.engineerName}</span>
            {(data.project?.client || r.client) && <span><Building2 size={14} /> {data.project?.client || r.client}</span>}
            <span><CalendarDays size={14} /> {fmtDate(r.reportDate)} · {fmtTime(r.createdAt)}</span>
            {r.siteLocation && <span><MapPin size={14} /> {r.siteLocation}</span>}
          </div>
        </div>
        <div className="rv-status">
          <Badge value={r.projectStatus} />
          {r.progressPercent != null && <Progress value={r.progressPercent} />}
          <button className="btn ghost sm" disabled={pdfBusy} onClick={downloadPdf}><FileDown size={15} /> {pdfBusy ? 'Preparing…' : 'Download PDF'}</button>
        </div>
      </div>
      {pdfErr && <div className="alert error" style={{ marginTop: 8 }}>{pdfErr}</div>}

      {prev && (
        <div className="compare-toggle">
          <label className="switch"><input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> <span>Compare with previous update ({fmtDate(prev.reportDate)})</span></label>
        </div>
      )}

      <div className={`rv-table ${compare && prev ? 'cmp' : ''}`}>
        {compare && prev && (
          <div className="rv-row rv-colhead"><div /><div>Previous · {fmtDate(prev.reportDate)}</div><div>This update · {fmtDate(r.reportDate)}</div></div>
        )}
        {ROWS.map(([k, label]) => (
          <div className="rv-row" key={k}>
            <div className="rv-label">{label}</div>
            {compare && prev && <div className="rv-val prev">{prev[k] || '—'}{k === 'materialRequired' && prev.materialStatus && <> <Badge value={prev.materialStatus} /></>}</div>}
            <div className="rv-val">
              {r[k] || '—'}
              {k === 'materialRequired' && r.materialRequired && (
                <div className="mat-row">
                  <Badge value={r.materialStatus} />
                  {isHead && ['Required', 'Ordered', 'Delivered'].filter((s) => s !== r.materialStatus).map((s) => (
                    <button key={s} className="btn ghost xs" onClick={() => setMaterial(s)}>Mark {s}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {compare && prev && (
          <div className="rv-row">
            <div className="rv-label">Status / Progress</div>
            <div className="rv-val prev"><Badge value={prev.projectStatus} /> {prev.progressPercent != null && `${prev.progressPercent}%`}</div>
            <div className="rv-val"><Badge value={r.projectStatus} /> {r.progressPercent != null && `${r.progressPercent}%`}</div>
          </div>
        )}
      </div>

      {r.materialHistory?.length > 0 && (
        <div className="small muted mt">Material log: {r.materialHistory.map((h, i) => <span key={i}>{h.to} by {h.by} ({fmtDateTime(h.at)}){i < r.materialHistory.length - 1 ? ' · ' : ''}</span>)}</div>
      )}

      <div className="section-head mt-lg"><h4>Site Visit Photos ({r.photos.length})</h4><DownloadAll report={r} /></div>
      <PhotoGrid report={r} />
      {compare && prev && prev.photos.length > 0 && (
        <>
          <h4 className="mt">Previous update photos ({fmtDate(prev.reportDate)})</h4>
          <PhotoGrid report={prev} small />
        </>
      )}

      <div className="section-head mt-lg"><h4><MessageSquare size={16} /> Comments & Instructions</h4></div>
      <div className="comments">
        {comments.length === 0 && <div className="muted small">No comments on this update yet.</div>}
        {comments.map((c) => (
          <div key={c.id} className={`comment ${c.authorRole === 'head' ? 'from-head' : ''}`}>
            <div className="c-head"><strong>{c.authorName}</strong> <span className="muted small">{fmtDateTime(c.createdAt)}</span></div>
            <div>{c.text}</div>
          </div>
        ))}
        <form className="comment-form" onSubmit={addComment}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={isHead ? 'Add an instruction for the engineer…' : 'Reply to the Execution Head…'} />
          <button className="btn primary" disabled={busy || !text.trim()}>Send</button>
        </form>
      </div>
      <Link to={`/projects/${r.projectId}`} className="btn ghost mt-lg">Full site history <ArrowRight size={16} /></Link>
    </div>
  );
}
