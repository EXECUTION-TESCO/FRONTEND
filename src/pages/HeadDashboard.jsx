import { Link, useNavigate } from 'react-router-dom';
import { FolderKanban, CheckCircle2, Hammer, MapPinned, Eye, Plus } from 'lucide-react';
import { useState } from 'react';
import { useLiveApi as useApi } from '../hooks.js';
import { fmtDate, fmtTime } from '../api.js';
import { Badge, Loader, ErrorBox, Empty, Progress } from '../components/ui.jsx';
import ProjectForm from '../components/ProjectForm.jsx';

const CARDS = [
  ['totalProjects', 'Total Projects', FolderKanban, 'navy', '/projects'],
  ['completedProjects', 'Completed Projects', CheckCircle2, 'green', '/projects?status=Completed'],
  ['inProgress', 'Projects In Progress', Hammer, 'teal', '/projects?status=Work In Progress'],
];

export default function HeadDashboard() {
  const { data, error, loading, reload } = useApi('/dashboard');
  const [showNew, setShowNew] = useState(false);
  const nav = useNavigate();
  if (loading && !data) return <Loader />;
  if (error) return <ErrorBox error={error} />;
  const d = data;
  const jump = (to) => nav(to);

  return (
    <div>
      <div className="page-head">
        <div><h2>Dashboard</h2><div className="muted">Today · {fmtDate(d.today)}</div></div>
        <button className="btn primary" onClick={() => setShowNew(true)}><Plus size={18} /> Assign Project</button>
      </div>

      <div className="cards three head-cards">
        {CARDS.map(([k, label, Icon, color, to]) => (
          <button key={k} className={`stat c-${color}`} onClick={() => jump(to)}>
            <div className="stat-icon"><Icon size={20} /></div>
            <div className="stat-val">{d.cards[k]}</div>
            <div className="stat-label">{label}</div>
          </button>
        ))}
      </div>

      <section className="panel" id="today">
        <div className="panel-head"><h3>Today's Site Updates</h3><Link to={`/reports?date=${d.today}`} className="link">Open in Daily Reports</Link></div>
        {d.todaysUpdates.length === 0 ? (
          <Empty icon={MapPinned} title="No updates submitted yet today">Updates appear here as engineers submit them from site.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>Engineer</th><th>Site Name</th><th>Today's Work</th><th>Material Required</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {d.todaysUpdates.map((u) => (
                  <tr key={u.id}>
                    <td data-label="Engineer"><strong>{u.engineerName}</strong><div className="muted small">{fmtTime(u.createdAt)}</div></td>
                    <td data-label="Site Name">{u.projectName}</td>
                    <td data-label="Today's Work" className="wrap">{u.todayProgress}{u.photoCount > 0 && <span className="chip">📷 {u.photoCount}</span>}</td>
                    <td data-label="Material Required">{u.materialRequired ? <>{u.materialRequired} <Badge value={u.materialStatus} /></> : '—'}</td>
                    <td data-label="Status"><Badge value={u.status} /></td>
                    <td data-label="Action"><Link to={`/reports/${u.id}`} className="btn ghost sm"><Eye size={15} /> View Details</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid-2">
        <section className="panel" id="pending">
          <div className="panel-head"><h3>Pending Daily Updates ({d.pendingUpdates.length})</h3></div>
          {d.pendingUpdates.length === 0 ? <div className="muted pad">All active sites have been updated today. 👍</div> : (
            <ul className="list">
              {d.pendingUpdates.map((p) => (
                <li key={p.projectId}><Link to={`/projects/${p.projectId}`}>{p.projectName}</Link><span className="muted">{p.engineerName}</span></li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel" id="material">
          <div className="panel-head"><h3>Open Material Requirements ({d.openMaterial.length})</h3></div>
          {d.openMaterial.length === 0 ? <div className="muted pad">No pending material requests.</div> : (
            <ul className="list">
              {d.openMaterial.map((m) => (
                <li key={m.reportId}>
                  <div><Link to={`/reports/${m.reportId}`}><strong>{m.projectName}</strong></Link><div className="small">{m.materialRequired}</div></div>
                  <div className="right"><Badge value={m.materialStatus} /><div className="muted small">{m.engineerName} · {fmtDate(m.reportDate)}</div></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-head"><h3>Latest Status of Every Project</h3><Link to="/projects" className="link">All projects</Link></div>
        {d.projects.length === 0 ? (
          <Empty icon={FolderKanban} title="No projects yet"><button className="btn primary mt" onClick={() => setShowNew(true)}>Assign your first project</button></Empty>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>Project</th><th>Engineer</th><th>Status</th><th>Progress</th><th>Last Update</th><th>Due</th></tr></thead>
              <tbody>
                {d.projects.filter((p) => p.status !== 'Completed').map((p) => (
                  <tr key={p.id} className="click" onClick={() => nav(`/projects/${p.id}`)}>
                    <td data-label="Project"><strong>{p.name}</strong>{p.location && <div className="muted small">{p.location}</div>}</td>
                    <td data-label="Engineer">{p.engineerName}</td>
                    <td data-label="Status"><Badge value={p.status} />{p.overdue && p.status !== 'Delayed' && <Badge value="Delayed" extra=" (overdue)" />}</td>
                    <td data-label="Progress"><Progress value={p.progressPercent} /></td>
                    <td data-label="Last Update">{p.updatedToday ? <span className="ok">Today</span> : fmtDate(p.lastReportDate)}</td>
                    <td data-label="Due">{fmtDate(p.expectedDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {showNew && <ProjectForm onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); reload(); }} />}
    </div>
  );
}
