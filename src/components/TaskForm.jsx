import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Modal, Field, ErrorBox } from './ui.jsx';

const PRIORITIES = ['Low', 'Medium', 'High'];

// Head-only: create or edit a task on an accepted project and assign it to a team member.
export default function TaskForm({ task, onClose, onSaved }) {
  const editing = !!task;
  const [projects, setProjects] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [deps, setDeps] = useState([]);
  const [f, setF] = useState({
    projectId: task?.projectId || '', engineerId: task?.engineerId || '',
    title: task?.title || '', description: task?.description || '', instructions: task?.instructions || '',
    priority: task?.priority || 'Medium', startDate: task?.startDate || '', endDate: task?.endDate || '',
    dependsOn: task?.dependsOn || [],
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    if (!editing) api('/projects').then((l) => setProjects(Array.isArray(l) ? l : [])).catch(() => {});
    api('/users?role=engineer').then((l) => setEngineers((l || []).filter((e) => e.active !== false))).catch(() => {});
  }, []); // eslint-disable-line
  useEffect(() => {
    if (!f.projectId) { setDeps([]); return; }
    api(`/tasks?projectId=${f.projectId}`).then((l) => setDeps((l || []).filter((x) => !task || x.id !== task.id))).catch(() => setDeps([]));
  }, [f.projectId]); // eslint-disable-line

  const toggleDep = (id) => setF((s) => ({ ...s, dependsOn: s.dependsOn.includes(id) ? s.dependsOn.filter((x) => x !== id) : [...s.dependsOn, id] }));

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const saved = editing ? await api(`/tasks/${task.id}`, { method: 'PUT', body: f }) : await api('/tasks', { method: 'POST', body: f });
      onSaved(saved);
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  return (
    <Modal title={editing ? 'Edit Task' : 'New Task'} onClose={onClose} wide>
      <form onSubmit={submit}>
        <ErrorBox error={err} />
        <div className="form-grid">
          {!editing && (
            <Field label="Project *">
              <select value={f.projectId} onChange={set('projectId')} required>
                <option value="">— Select an accepted project —</option>
                {[...projects].sort((a, b) => a.name.localeCompare(b.name)).map((p) => <option key={p.id} value={p.id}>{p.name}{p.client ? ` — ${p.client}` : ''}</option>)}
              </select>
            </Field>
          )}
          <Field label="Assign to Team Member">
            <select value={f.engineerId} onChange={set('engineerId')}>
              <option value="">— Unassigned —</option>
              {engineers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </Field>
          <Field label="Task Title *"><input value={f.title} onChange={set('title')} required autoFocus placeholder="e.g. Site marking & foundation" /></Field>
          <Field label="Priority"><select value={f.priority} onChange={set('priority')}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Start Date"><input type="date" value={f.startDate} onChange={set('startDate')} /></Field>
          <Field label="Deadline"><input type="date" value={f.endDate} onChange={set('endDate')} /></Field>
          <Field label="Description" full><textarea rows={2} value={f.description} onChange={set('description')} /></Field>
          <Field label="Instructions" full><textarea rows={2} value={f.instructions} onChange={set('instructions')} placeholder="Instructions the team member will see" /></Field>
        </div>
        {deps.length > 0 && (
          <label className="field full">
            <span className="label">Depends on (these must finish first)</span>
            <div className="dep-list">
              {deps.map((d) => <label key={d.id} className="check"><input type="checkbox" checked={f.dependsOn.includes(d.id)} onChange={() => toggleDep(d.id)} /> {d.title}</label>)}
            </div>
          </label>
        )}
        <div className="muted small" style={{ marginTop: 6 }}>You can upload reference documents &amp; drawings from the task once it's created.</div>
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save Changes' : 'Create & Assign'}</button>
        </div>
      </form>
    </Modal>
  );
}
