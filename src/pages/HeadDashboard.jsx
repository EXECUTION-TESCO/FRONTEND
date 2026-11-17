import { Link, useNavigate } from 'react-router-dom';
import { FolderKanban, CheckCircle2, Hammer, MapPinned, Eye, FileStack, ArrowRight } from 'lucide-react';
import { useLiveApi as useApi } from '../hooks.js';
import { fmtDate, fmtDateTime, fmtTime } from '../api.js';
import { Badge, Loader, ErrorBox, Empty, Progress } from '../components/ui.jsx';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const CARDS = [
  ['totalProjects', 'Total Projects', FolderKanban, 'navy', '/projects'],
  ['completedProjects', 'Completed Projects', CheckCircle2, 'green', '/projects?status=Completed'],
  ['inProgress', 'Projects In Progress', Hammer, 'teal', '/projects?status=Work In Progress'],
];

export default function HeadDashboard() {
  const { data, error, loading } = useApi('/dashboard');
  const { data: hoData } = useApi('/handovers?status=Submitted');
  const nav = useNavigate();
  if (loading && !data) return <Loader />;
  if (error) return <ErrorBox error={error} />;
  const d = data;
  const jump = (to) => nav(to);
  const pendingHandovers = hoData?.handovers || [];

  return (
    <div>
      <div className="page-head">
        <div><h2>Dashboard</h2><div className="muted">Today · {fmtDate(d.today)}</div></div>
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

      {pendingHandovers.length > 0 && (
        <section className="panel" id="handovers">
          <div className="panel-head"><h3><FileStack size={18} /> Handovers from Sales — pending review ({pendingHandovers.length})</h3><Link to="/handovers" className="link">Open Handovers</Link></div>
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>Reference</th><th>Project</th><th>Client</th><th>Value</th><th>From (Sales)</th><th>Received</th><th>Action</th></tr></thead>
              <tbody>
                {pendingHandovers.map((h) => (
                  <tr key={h.id} className="click" onClick={() => nav('/handovers')}>
                    <td data-label="Reference"><strong>{h.ref || '—'}</strong></td>
                    <td data-label="Project">{h.projectName || '—'}{h.details?.projectLocation && <div className="muted small">{h.details.projectLocation}</div>}</td>
                    <td data-label="Client">{h.clientName || '—'}</td>
                    <td data-label="Value">{inr(h.projectValue)}</td>
                    <td data-label="From (Sales)">{h.createdBy?.name || '—'}</td>
                    <td data-label="Received">{fmtDateTime(h.submittedAt)}</td>
                    <td data-label="Action"><Link to="/handovers" className="btn ghost sm" onClick={(e) => e.stopPropagation()}>Review <ArrowRight size={15} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
          <Empty icon={FolderKanban} title="No projects yet">Projects appear here once you accept a handover from Sales.</Empty>
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
    </div>
  );
}
