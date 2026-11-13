import { Bell } from 'lucide-react';
import { timeAgo } from '../api.js';
import { useNotifications } from '../notifications.jsx';
import { Empty } from '../components/ui.jsx';

export default function Notifications() {
  const { items, unread, open, markAll } = useNotifications();
  return (
    <div className="narrow">
      <div className="page-head">
        <div><h2>Notifications</h2><div className="muted">{unread ? `${unread} unread` : 'All caught up'}</div></div>
        {unread > 0 && <button className="btn ghost sm" onClick={markAll}>Mark all read</button>}
      </div>
      {!items.length ? <Empty icon={Bell} title="You're all caught up" /> : (
        <div className="panel no-pad">
          {items.map((n) => (
            <button key={n.id} className={`bell-item full ${n.read ? '' : 'unread'} t-${n.type}`} onClick={() => open(n)}>
              <div className="bell-title">{n.title}</div>
              <div className="bell-msg">{n.message}</div>
              <div className="bell-time">{n.virtual ? 'Today' : timeAgo(n.createdAt)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
