import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Modal, Field, ErrorBox } from './ui.jsx';

const STATUSES = ['Not Started', 'Work In Progress', 'On Hold', 'Material Pending', 'Completed', 'Delayed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const blank = { name: '', client: '', location: '', engineerId: '', startDate: '', expectedDate: '', scope: '', priority: 'Medium', instructions: '', status: 'Not Started' };

export default function ProjectForm({ project, onClose, onSaved }) {
  const [f, setF] = useState(project ? { ...blank, ...project, engineerId: project.engineerId || '' } : blank);
  const [engineers, setEngineers] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('/users?role=engineer').then((l) => setEngineers(l.filter((e) => e.active))).catch(() => {}); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const body = Object.fromEntries(Object.keys(blank).map((k) => [k, f[k]]));
      const saved = project ? await api(`/projects/${project.id}`, { method: 'PUT', body }) : await api('/projects', { method: 'POST', body });
      onSaved(saved);
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  return (
    <Modal title={project ? 'Edit / Reassign Project' : 'Assign New Project'} onClose={onClose} wide>
      <form onSubmit={submit}>
        <ErrorBox error={err} />
        <div className="form-grid">
          <Field label="Project Name *"><input value={f.name} onChange={set('name')} required autoFocus /></Field>
          <Field label="Client Name"><input value={f.client} onChange={set('client')} /></Field>
          <Field label="Site Location"><input value={f.location} onChange={set('location')} /></Field>
          <Field label="Assigned Engineer" hint={engineers.length ? '' : 'Add engineers in the Team page first'}>
            <select value={f.engineerId} onChange={set('engineerId')}>
              <option value="">— Unassigned —</option>
              {engineers.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.activeProjects} active)</option>)}
            </select>
          </Field>
          <Field label="Project Start Date"><input type="date" value={f.startDate} onChange={set('startDate')} /></Field>
          <Field label="Expected Completion Date"><input type="date" value={f.expectedDate} onChange={set('expectedDate')} /></Field>
          <Field label="Priority"><select value={f.priority} onChange={set('priority')}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Project Status"><select value={f.status} onChange={set('status')}>{STATUSES.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Scope of Work" full><textarea rows={3} value={f.scope} onChange={set('scope')} /></Field>
          <Field label="Work Instructions" full><textarea rows={3} value={f.instructions} onChange={set('instructions')} placeholder="Instructions the engineer will see for this site" /></Field>
        </div>
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : project ? 'Save Changes' : 'Assign Project'}</button>
        </div>
      </form>
    </Modal>
  );
}
