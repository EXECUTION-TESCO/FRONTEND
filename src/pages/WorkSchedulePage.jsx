import { useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { useApi } from '../hooks.js';
import { Loader, ErrorBox, Empty } from '../components/ui.jsx';
import WorkSchedule from '../components/WorkSchedule.jsx';

// Standalone Work Schedule page (sidebar): pick a project, then build & print its schedule.
export default function WorkSchedulePage() {
  const { data: projects, error, loading, reload } = useApi('/projects');
  const [sel, setSel] = useState('');
  const list = Array.isArray(projects) ? projects : [];
  const project = list.find((p) => p.id === sel) || null;

  return (
    <div>
      <div className="page-head">
        <div><h2>Work Schedule</h2><div className="muted">Build and print a project work schedule</div></div>
      </div>

      {loading && !projects ? <Loader /> : error ? <ErrorBox error={error} /> : (
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
      )}
    </div>
  );
}
