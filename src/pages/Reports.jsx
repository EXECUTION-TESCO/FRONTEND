import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { FileSpreadsheet, FileDown, FileText, X } from 'lucide-react';
import { api, qs, fmtDate, fmtTime, downloadFile } from '../api.js';
import { useLiveApi as useApi } from '../hooks.js';
import { useAuth } from '../auth.jsx';
import { Badge, Loader, ErrorBox, Empty } from '../components/ui.jsx';

export default function Reports() {
  const { isHead } = useAuth();
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const filters = { date: sp.get('date') || '', from: sp.get('from') || '', to: sp.get('to') || '', engineerId: sp.get('engineerId') || '', projectId: sp.get('projectId') || '', material: sp.get('material') || '' };
  const [engineers, setEngineers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [exporting, setExporting] = useState('');
  useEffect(() => {
    if (isHead) api('/users?role=engineer').then(setEngineers).catch(() => {});
    api('/projects').then(setProjects).catch(() => {});
  }, [isHead]);
  const { data, error, loading } = useApi(`/reports${qs(filters)}`);
  const set = (k, v) => {
    const n = new URLSearchParams(sp);
    v ? n.set(k, v) : n.delete(k);
    if (k === 'date' && v) { n.delete('from'); n.delete('to'); }
    if ((k === 'from' || k === 'to') && v) n.delete('date');
    setSp(n);
  };
  const exp = async (format) => {
    setExporting(format);
    try { await downloadFile(`/exports/reports${qs({ ...filters, format })}`, `daily-reports-${filters.date || filters.from || 'all'}.${format === 'pdf' ? 'pdf' : 'xlsx'}`); }
    catch (e) { alert(e.message); } finally { setExporting(''); }
  };
  const active = Object.values(filters).some(Boolean);

  // group by date
  const groups = [];
  (data || []).forEach((r) => {
    const g = groups[groups.length - 1];
    if (g && g.date === r.reportDate) g.items.push(r); else groups.push({ date: r.reportDate, items: [r] });
  });

  return (
    <div>
      <div className="page-head">
        <div><h2>{isHead ? 'Daily Reports' : 'My Updates'}</h2><div className="muted">{isHead ? 'Every submitted site update, stored date-wise' : 'All updates you have submitted'}</div></div>
        <div className="head-actions">
          <button className="btn ghost" onClick={() => exp('xlsx')} disabled={!!exporting || !data?.length}><FileSpreadsheet size={17} /> {exporting === 'xlsx' ? 'Exporting…' : 'Excel'}</button>
          <button className="btn ghost" onClick={() => exp('pdf')} disabled={!!exporting || !data?.length}><FileDown size={17} /> {exporting === 'pdf' ? 'Exporting…' : 'PDF'}</button>
        </div>
      </div>

      <div className="filters">
        <label className="mini"><span>Date</span><input type="date" value={filters.date} onChange={(e) => set('date', e.target.value)} /></label>
        <label className="mini"><span>From</span><input type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} /></label>
        <label className="mini"><span>To</span><input type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} /></label>
        {isHead && (
          <label className="mini"><span>Engineer</span>
            <select value={filters.engineerId} onChange={(e) => set('engineerId', e.target.value)}>
              <option value="">All engineers</option>
              {engineers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </label>
        )}
        <label className="mini"><span>Project / Site</span>
          <select value={filters.projectId} onChange={(e) => set('projectId', e.target.value)}>
            <option value="">All sites</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="mini"><span>Material</span>
          <select value={filters.material} onChange={(e) => set('material', e.target.value)}>
            <option value="">Any</option>
            <option value="open">Open requests only</option>
          </select>
        </label>
        {active && <button className="btn ghost sm align-end" onClick={() => setSp({})}><X size={14} /> Clear</button>}
      </div>

      <ErrorBox error={error} />
      {loading && !data ? <Loader /> : data?.length === 0 ? (
        <Empty icon={FileText} title="No reports found">{active ? 'Try changing the filters.' : 'Daily updates will appear here once submitted.'}</Empty>
      ) : groups.map((g) => (
        <section key={g.date} className="panel no-pad">
          <div className="panel-head pad"><h3>{fmtDate(g.date)}</h3><span className="muted small">{g.items.length} update(s)</span></div>
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr>{isHead && <th>Engineer</th>}<th>Site</th><th>Today's Work</th><th>Tomorrow</th><th>Material</th><th>Status</th><th>Photos</th></tr></thead>
              <tbody>
                {g.items.map((r) => (
                  <tr key={r.id} className="click" onClick={() => nav(`/reports/${r.id}`)}>
                    {isHead && <td data-label="Engineer"><strong>{r.engineerName}</strong><div className="muted small">{fmtTime(r.createdAt)}</div></td>}
                    <td data-label="Site"><Link to={`/reports/${r.id}`} onClick={(e) => e.stopPropagation()}>{r.projectName}</Link>{!isHead && <div className="muted small">{fmtTime(r.createdAt)}</div>}</td>
                    <td data-label="Today's Work" className="wrap">{r.todayProgress || r.workCompleted}</td>
                    <td data-label="Tomorrow" className="wrap">{r.tomorrowPlan || '—'}</td>
                    <td data-label="Material">{r.materialRequired ? <>{r.materialRequired} <Badge value={r.materialStatus} /></> : '—'}</td>
                    <td data-label="Status"><Badge value={r.projectStatus} /></td>
                    <td data-label="Photos">{r.photos.length ? `📷 ${r.photos.length}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
