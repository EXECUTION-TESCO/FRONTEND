import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, FolderKanban, Pencil } from 'lucide-react';
import { api, qs, fmtDate } from '../api.js';
import { useApi } from '../hooks.js';
import { Badge, Loader, ErrorBox, Empty, Progress } from '../components/ui.jsx';
import ProjectForm from '../components/ProjectForm.jsx';

const FILTERS = ['', 'Active', 'Not Started', 'Work In Progress', 'On Hold', 'Material Pending', 'Delayed', 'Completed'];

export default function Projects() {
  const [sp, setSp] = useSearchParams();
  const status = sp.get('status') || '';
  const engineerId = sp.get('engineerId') || '';
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [edit, setEdit] = useState(null);
  const [engineers, setEngineers] = useState([]);
  const [assignErr, setAssignErr] = useState('');
  const [assigning, setAssigning] = useState('');
  const nav = useNavigate();
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 250); return () => clearTimeout(t); }, [q]);
  useEffect(() => { api('/users?role=engineer').then(setEngineers).catch(() => {}); }, []);
  const { data, error, loading, reload } = useApi(`/projects${qs({ status, engineerId, q: debounced })}`);
  const setParam = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n); };

  // Assign / reassign an engineer straight from the row.
  const assign = async (id, eng) => {
    setAssignErr(''); setAssigning(id);
    try { await api(`/projects/${id}`, { method: 'PUT', body: { engineerId: eng } }); reload(); }
    catch (e) { setAssignErr(e.message); } finally { setAssigning(''); }
  };

  return (
    <div>
      <div className="page-head">
        <div><h2>Projects & Sites</h2><div className="muted">Assign accepted handovers to the team and monitor every site</div></div>
      </div>
      <div className="filters">
        <div className="search"><Search size={16} /><input placeholder="Search project, client, location" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select value={status} onChange={(e) => setParam('status', e.target.value)}>
          {FILTERS.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
        <select value={engineerId} onChange={(e) => setParam('engineerId', e.target.value)}>
          <option value="">All engineers</option>
          {engineers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>
      <ErrorBox error={error || assignErr} />
      {loading && !data ? <Loader /> : data?.length === 0 ? (
        <Empty icon={FolderKanban} title="No projects found">Projects appear here once the Execution Head accepts a handover from Sales.</Empty>
      ) : (
        <div className="panel no-pad">
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>Project</th><th>Client</th><th>Assign Engineer</th><th>Priority</th><th>Status</th><th>Progress</th><th>Last Update</th><th>Due</th><th /></tr></thead>
              <tbody>
                {data?.map((p) => (
                  <tr key={p.id} className="click" onClick={() => nav(`/projects/${p.id}`)}>
                    <td data-label="Project"><strong>{p.name}</strong>{p.location && <div className="muted small">{p.location}</div>}</td>
                    <td data-label="Client">{p.client || '—'}</td>
                    <td data-label="Assign Engineer" onClick={(e) => e.stopPropagation()}>
                      <select className="assign-select" value={p.engineerId || ''} disabled={assigning === p.id} onChange={(e) => assign(p.id, e.target.value)}>
                        <option value="">— Unassigned —</option>
                        {engineers.filter((en) => en.active !== false).map((en) => <option key={en.id} value={en.id}>{en.name}</option>)}
                      </select>
                    </td>
                    <td data-label="Priority"><Badge value={p.priority} /></td>
                    <td data-label="Status"><Badge value={p.status} />{p.overdue && p.status !== 'Delayed' && <Badge value="Delayed" extra=" (overdue)" />}</td>
                    <td data-label="Progress"><Progress value={p.progressPercent} /></td>
                    <td data-label="Last Update">{p.updatedToday ? <span className="ok">Today</span> : fmtDate(p.lastReportDate)}</td>
                    <td data-label="Due">{fmtDate(p.expectedDate)}</td>
                    <td data-label=""><button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setEdit(p); }}><Pencil size={14} /> Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {edit && <ProjectForm project={edit.id ? edit : null} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </div>
  );
}
