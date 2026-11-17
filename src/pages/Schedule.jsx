import { useState, useEffect } from 'react';
import { Plus, CalendarRange, List } from 'lucide-react';
import { api, qs, fmtDate } from '../api.js';
import { useApi } from '../hooks.js';
import { Badge, Loader, ErrorBox, Empty } from '../components/ui.jsx';
import TaskForm from '../components/TaskForm.jsx';
import TaskModal from '../components/TaskModal.jsx';
import ScheduleCalendar from '../components/ScheduleCalendar.jsx';

const STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Completed', 'Changes Requested', 'Overdue'];
const PRIORITIES = ['Low', 'Medium', 'High'];

// Execution Head: plan, assign and monitor every project's tasks.
export default function Schedule() {
  const [view, setView] = useState('list');
  const [filters, setFilters] = useState({ projectId: '', engineerId: '', status: '', priority: '', from: '', to: '' });
  const [projects, setProjects] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [form, setForm] = useState(null);
  const [open, setOpen] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api('/projects').then((l) => setProjects(Array.isArray(l) ? l : [])).catch(() => {});
    api('/users?role=engineer').then((l) => setEngineers(l || [])).catch(() => {});
  }, []);
  const loadStats = () => api('/tasks/stats').then(setStats).catch(() => {});
  useEffect(() => { loadStats(); }, []);

  const { data, error, loading, reload } = useApi(`/tasks${qs(filters)}`);
  const setF = (k, v) => setFilters((s) => ({ ...s, [k]: v }));
  const tasks = data || [];
  const refresh = () => { reload(); loadStats(); };

  const CARDS = stats ? [
    ['Total', stats.total, 'navy'], ['Not Started', stats.notStarted, 'gray'], ['In Progress', stats.inProgress, 'teal'],
    ['Completed', stats.completed, 'green'], ['Overdue', stats.overdue, 'red'], ['Due Today', stats.dueToday, 'amber'], ['Approaching', stats.approaching, 'navy'],
  ] : [];

  return (
    <div>
      <div className="page-head">
        <div><h2>Work Schedule</h2><div className="muted">Plan tasks, assign the team and monitor progress</div></div>
        <button className="btn primary" onClick={() => setForm({})}><Plus size={18} /> New Task</button>
      </div>

      {stats && (
        <div className="cards ws-cards">
          {CARDS.map(([label, val, color]) => (<div key={label} className={`stat c-${color}`}><div className="stat-val">{val}</div><div className="stat-label">{label}</div></div>))}
        </div>
      )}
      {stats && (stats.pendingApproval > 0 || stats.extensionRequests > 0) && (
        <div className="inline-flags">
          {stats.pendingApproval > 0 && <span className="badge b-amber">{stats.pendingApproval} awaiting approval</span>}
          {stats.extensionRequests > 0 && <span className="badge b-orange">{stats.extensionRequests} extension request(s)</span>}
        </div>
      )}

      <div className="ws-toolbar">
        <div className="filters">
          <select value={filters.projectId} onChange={(e) => setF('projectId', e.target.value)}><option value="">All projects</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select value={filters.engineerId} onChange={(e) => setF('engineerId', e.target.value)}><option value="">All members</option>{engineers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
          <select value={filters.status} onChange={(e) => setF('status', e.target.value)}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          <select value={filters.priority} onChange={(e) => setF('priority', e.target.value)}><option value="">All priorities</option>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select>
          <input type="date" value={filters.from} onChange={(e) => setF('from', e.target.value)} title="Deadline from" />
          <input type="date" value={filters.to} onChange={(e) => setF('to', e.target.value)} title="Deadline to" />
        </div>
        <div className="view-toggle">
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><List size={16} /> List</button>
          <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}><CalendarRange size={16} /> Calendar</button>
        </div>
      </div>

      <ErrorBox error={error} />
      {loading && !data ? <Loader /> : view === 'calendar' ? (
        <div className="panel"><ScheduleCalendar tasks={tasks} onOpen={setOpen} /></div>
      ) : tasks.length === 0 ? (
        <Empty icon={CalendarRange} title="No tasks found">Create a task and assign it to a team member.</Empty>
      ) : (
        <div className="panel no-pad"><div className="table-wrap">
          <table className="table responsive">
            <thead><tr><th>Task</th><th>Project</th><th>Assigned</th><th>Priority</th><th>Status</th><th>Deadline</th></tr></thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="click" onClick={() => setOpen(t)}>
                  <td data-label="Task"><strong>{t.title}</strong>{t.approvalState === 'pending' && <span className="chip">pending approval</span>}</td>
                  <td data-label="Project">{t.projectName}</td>
                  <td data-label="Assigned">{t.engineerName}</td>
                  <td data-label="Priority"><Badge value={t.priority} /></td>
                  <td data-label="Status"><Badge value={t.status} />{t.overdue && <Badge value="Overdue" />}</td>
                  <td data-label="Deadline">{fmtDate(t.endDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      )}

      {form && <TaskForm task={form.id ? form : null} onClose={() => setForm(null)} onSaved={(saved) => { setForm(null); refresh(); if (saved && !form.id) setOpen(saved); }} />}
      {open && <TaskModal task={open} isHead onClose={() => setOpen(null)} onChanged={refresh} onEdit={(t) => { setOpen(null); setForm(t); }} />}
    </div>
  );
}
