import { useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { useApi } from '../hooks.js';
import { Loader, ErrorBox, Empty } from '../components/ui.jsx';
import WorkSchedule from '../components/WorkSchedule.jsx';
import { ShareManager } from '../components/ScheduleShare.jsx';

// Standalone Work Schedule page (sidebar): share schedules with team members, and build & print
// a project work schedule.
export default function WorkSchedulePage() {
  const { data: projects, error, loading, reload } = useApi('/projects');
  const [sel, setSel] = useState('');
  const [tab, setTab] = useState('share');
  const list = Array.isArray(projects) ? projects : [];
  const project = list.find((p) => p.id === sel) || null;

  return (
    <div>
      <div className="page-head">
        <div><h2>Work Schedule</h2><div className="muted">Share work schedules with team members, or build a project schedule</div></div>
      </div>

      <div className="filters" style={{ marginBottom: 14 }}>
        <button className={`chip ${tab === 'share' ? 'on' : ''}`} onClick={() => setTab('share')} style={{ padding: '7px 14px', borderRadius: 999, border: '1px solid #e2e8f0', background: tab === 'share' ? '#1e1b4b' : '#fff', color: tab === 'share' ? '#fff' : '#334155', cursor: 'pointer' }}>Share with team members</button>
        <button className={`chip ${tab === 'build' ? 'on' : ''}`} onClick={() => setTab('build')} style={{ padding: '7px 14px', borderRadius: 999, border: '1px solid #e2e8f0', background: tab === 'build' ? '#1e1b4b' : '#fff', color: tab === 'build' ? '#fff' : '#334155', cursor: 'pointer' }}>Build project schedule</button>
      </div>

      {tab === 'share' && <ShareManager projects={list} />}
      {tab === 'build' && (
        loading && !projects ? <Loader /> : error ? <ErrorBox error={error} /> : (
        <>
          <section className="panel" style={{ marginBottom: 16 }}>
            <label className="field" style={{ maxWidth: 480, margin: 0 }}>
              <span className="label">Select a project</span>
              <select value={sel} onChange={(e) => setSel(e.target.value)}>
                <option value="">— Choose a project —</option>
                {[...list].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.client ? ` — ${p.client}` : ''}</option>
                ))}
              </select>
            </label>
          </section>

          {project ? (
            <section className="panel"><WorkSchedule key={project.id} project={project} onSaved={reload} /></section>
          ) : (
            <Empty icon={CalendarRange} title="Select a project to build its work schedule">Choose a project above to add activities and generate the schedule.</Empty>
          )}
        </>
        )
      )}
    </div>
  );
}
