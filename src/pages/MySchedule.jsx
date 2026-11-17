import { useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { qs, fmtDate } from '../api.js';
import { useLiveApi as useApi } from '../hooks.js';
import { Badge, Loader, ErrorBox, Empty } from '../components/ui.jsx';
import TaskModal from '../components/TaskModal.jsx';

const STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Completed', 'Changes Requested', 'Overdue'];

// Execution Team member: only the tasks assigned to them.
export default function MySchedule() {
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(null);
  const { data, error, loading, reload } = useApi(`/tasks${qs({ status })}`);
  const tasks = data || [];

  return (
    <div>
      <div className="page-head">
        <div><h2>My Work Schedule</h2><div className="muted">Tasks assigned to you by the Execution Head</div></div>
      </div>
      <div className="ws-toolbar">
        <div className="filters">
          <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
      </div>
      <ErrorBox error={error} />
      {loading && !data ? <Loader /> : tasks.length === 0 ? (
        <Empty icon={CalendarRange} title="No tasks assigned yet">Tasks the Execution Head assigns to you will appear here.</Empty>
      ) : (
        <div className="ws-list">
          {tasks.map((t) => (
            <button key={t.id} className="ws-card" onClick={() => setOpen(t)}>
              <div className="ws-card-top"><strong>{t.title}</strong><Badge value={t.priority} /></div>
              <div className="muted small">{t.projectName}</div>
              {t.description && <div className="ws-card-desc">{t.description}</div>}
              <div className="ws-card-row">
                <Badge value={t.status} />
                {t.approvalState === 'pending' && <span className="badge b-amber">Pending approval</span>}
                {t.approvalState === 'changes' && <span className="badge b-orange">Changes requested</span>}
                {t.overdue && <span className="badge b-red">Overdue</span>}
                {t.dueToday && <span className="badge b-amber">Due today</span>}
              </div>
              <div className="muted small">Deadline: {fmtDate(t.endDate) || '—'}</div>
            </button>
          ))}
        </div>
      )}
      {open && <TaskModal task={open} isHead={false} onClose={() => setOpen(null)} onChanged={reload} />}
    </div>
  );
}
