import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Simple month calendar. Each task is placed on its deadline (endDate). Click a task to open it.
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const STATUS_DOT = { 'Not Started': 'gray', 'In Progress': 'blue', 'On Hold': 'amber', Completed: 'green', 'Changes Requested': 'orange' };

export default function ScheduleCalendar({ tasks, onOpen }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0 Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = ymd(new Date());

  const byDay = {};
  (tasks || []).forEach((t) => { if (t.endDate && t.endDate.slice(0, 7) === `${year}-${pad(month + 1)}`) { (byDay[t.endDate] = byDay[t.endDate] || []).push(t); } });

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthName = cursor.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="cal">
      <div className="cal-head">
        <button className="btn ghost sm" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft size={16} /></button>
        <strong>{monthName}</strong>
        <button className="btn ghost sm" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight size={16} /></button>
      </div>
      <div className="cal-grid cal-dow">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="cal-dowc">{d}</div>)}</div>
      <div className="cal-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="cal-cell empty" />;
          const key = `${year}-${pad(month + 1)}-${pad(d)}`;
          const items = byDay[key] || [];
          return (
            <div key={i} className={`cal-cell ${key === today ? 'today' : ''}`}>
              <div className="cal-date">{d}</div>
              <div className="cal-items">
                {items.slice(0, 4).map((t) => (
                  <button key={t.id} className={`cal-task dot-${STATUS_DOT[t.status] || 'gray'} ${t.overdue ? 'overdue' : ''}`} title={`${t.title} · ${t.engineerName}`} onClick={() => onOpen(t)}>
                    {t.title}
                  </button>
                ))}
                {items.length > 4 && <div className="muted small">+{items.length - 4} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
