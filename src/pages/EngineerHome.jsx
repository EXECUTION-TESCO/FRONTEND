import { Link } from 'react-router-dom';
import { PlusCircle, CheckCircle2, Clock, MapPin, FolderKanban, AlertTriangle } from 'lucide-react';
import { useLiveApi as useApi } from '../hooks.js';
import { useAuth } from '../auth.jsx';
import { fmtDate } from '../api.js';
import { Badge, Loader, ErrorBox, Empty, Progress } from '../components/ui.jsx';

export default function EngineerHome() {
  const { user } = useAuth();
  const { data, error, loading } = useApi('/dashboard');
  if (loading && !data) return <Loader />;
  if (error) return <ErrorBox error={error} />;
  const active = data.projects.filter((p) => p.status !== 'Completed');
  const done = data.projects.filter((p) => p.status === 'Completed');
  const pending = active.filter((p) => !p.updatedToday);

  return (
    <div>
      <div className="page-head">
        <div><h2>Hi, {user.name.split(' ')[0]}</h2><div className="muted">{fmtDate(data.today)} · {active.length} active site(s)</div></div>
        <Link to="/submit" className="btn primary big-mobile"><PlusCircle size={18} /> Submit Daily Update</Link>
      </div>

      <div className="cards three">
        <div className="stat c-amber"><div className="stat-icon"><Clock size={20} /></div><div className="stat-val">{pending.length}</div><div className="stat-label">Pending today</div></div>
        <div className="stat c-green"><div className="stat-icon"><CheckCircle2 size={20} /></div><div className="stat-val">{data.cards.todaysSiteVisits}</div><div className="stat-label">Updates submitted today</div></div>
        <div className="stat c-red"><div className="stat-icon"><AlertTriangle size={20} /></div><div className="stat-val">{data.cards.delayedProjects}</div><div className="stat-label">Delayed</div></div>
      </div>

      <h3 className="mt-lg">My Assigned Sites</h3>
      {active.length === 0 ? <Empty icon={FolderKanban} title="No sites assigned yet">The Execution Head will assign projects to you.</Empty> : (
        <div className="site-cards">
          {active.map((p) => (
            <div key={p.id} className={`site-card ${p.updatedToday ? 'done' : ''}`}>
              <Link to={`/projects/${p.id}`} className="site-main">
                <div className="site-top"><strong>{p.name}</strong><Badge value={p.priority} /></div>
                {p.location && <div className="muted small"><MapPin size={12} /> {p.location}</div>}
                <div className="site-row"><Badge value={p.status} /> {p.overdue && <span className="small danger">Overdue · due {fmtDate(p.expectedDate)}</span>}</div>
                <Progress value={p.progressPercent} />
                {p.instructions && <div className="small instr">📌 {p.instructions.slice(0, 120)}{p.instructions.length > 120 ? '…' : ''}</div>}
              </Link>
              <div className="site-foot">
                {p.updatedToday ? <span className="ok small"><CheckCircle2 size={14} /> Updated today</span> : <span className="warn small"><Clock size={14} /> Update pending</span>}
                <Link to={`/submit?project=${p.id}`} className="btn primary sm">{p.updatedToday ? 'Add another' : 'Update'}</Link>
              </div>
            </div>
          ))}
        </div>
      )}
      {done.length > 0 && (
        <>
          <h3 className="mt-lg">Completed</h3>
          <div className="eng-projects">{done.map((p) => <Link key={p.id} to={`/projects/${p.id}`} className="chip done">{p.name}</Link>)}</div>
        </>
      )}
    </div>
  );
}
