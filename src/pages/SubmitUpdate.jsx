import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Camera, ImagePlus, X, CheckCircle2, Send } from 'lucide-react';
import { api, compressImage, fmtDate } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Field, ErrorBox, Loader, Empty } from '../components/ui.jsx';
import CameraCapture, { canUseLiveCamera } from '../components/CameraCapture.jsx';

const STATUSES = ['Not Started', 'Work In Progress', 'On Hold', 'Material Pending', 'Completed', 'Delayed'];
const WORK_ACTIVITIES = ['Site Surveying', 'Site Marking', 'Soil Excavation', 'Foundation Work', 'Flooring Work', 'Fabrication Work', 'Painting', 'Erection Work', 'Sheet Measurement', 'Sheet Installation'];
const blank = { projectId: '', todayActivities: [], todayProgress: '', workCompleted: '', tomorrowActivities: [], tomorrowPlan: '', materialRequired: '', materialStatus: 'Required', issues: '', remarks: '', projectStatus: '' };

export default function SubmitUpdate() {
  const { user } = useAuth();
  const [sp] = useSearchParams();
  const [projects, setProjects] = useState(null);
  const [today, setToday] = useState('');
  const [f, setF] = useState({ ...blank, projectId: sp.get('project') || '' });
  const [photos, setPhotos] = useState([]); // {file, url}
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [camOpen, setCamOpen] = useState(false);
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);

  const load = () => api('/dashboard').then((d) => { setProjects(d.projects.filter((p) => p.status !== 'Completed')); setToday(d.today); });
  useEffect(() => { load().catch((e) => setErr(e.message)); }, []);
  const project = useMemo(() => projects?.find((p) => p.id === f.projectId), [projects, f.projectId]);
  useEffect(() => {
    if (project) setF((o) => ({ ...o, projectStatus: project.status === 'Not Started' ? 'Work In Progress' : project.status }));
  }, [project]);
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleAct = (key, act) => setF((o) => ({ ...o, [key]: o[key].includes(act) ? o[key].filter((a) => a !== act) : [...o[key], act] }));
  const addFiles = async (list) => {
    const files = Array.from(list || []).filter((x) => x.type.startsWith('image/'));
    const out = [];
    for (const file of files) {
      const c = await compressImage(file);
      out.push({ file: c, url: URL.createObjectURL(c) });
    }
    setPhotos((p) => [...p, ...out].slice(0, 20));
  };
  // Camera: live in-app camera when the browser allows it (HTTPS / localhost), otherwise the phone's camera app
  const openCamera = () => (canUseLiveCamera() ? setCamOpen(true) : cameraRef.current.click());
  const addShot = (file) => setPhotos((p) => (p.length >= 20 ? p : [...p, { file, url: URL.createObjectURL(file) }]));
  const removePhoto = (i) => setPhotos((p) => { URL.revokeObjectURL(p[i].url); return p.filter((_, k) => k !== i); });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!f.projectId) return setErr('Select a site / project');
    if (!f.todayActivities.length && !f.todayProgress.trim() && !f.workCompleted.trim()) return setErr("Select today's work activity or enter today's progress");
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => fd.append(k, Array.isArray(v) ? JSON.stringify(v) : v));
      photos.forEach((p) => fd.append('photos', p.file, p.file.name));
      const rep = await api('/reports', { method: 'POST', form: fd });
      setDone(rep);
      photos.forEach((p) => URL.revokeObjectURL(p.url));
      setPhotos([]);
      setF(blank);
      load();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  if (!projects) return err ? <ErrorBox error={err} /> : <Loader />;
  if (projects.length === 0) return <Empty title="No active sites assigned">You can submit updates once the Execution Head assigns a site to you.</Empty>;
  const remaining = projects.filter((p) => !p.updatedToday);

  return (
    <div className="narrow">
      <div className="page-head"><div><h2>Daily Site Update</h2><div className="muted">You can submit updates for multiple sites today</div></div></div>

      {done && (
        <div className="alert success">
          <CheckCircle2 size={18} /> Update for <b>{done.projectName}</b> submitted{done.photos.length ? ` with ${done.photos.length} photo(s)` : ''}.
          <div className="mt-xs">{remaining.length ? <>Still pending today: {remaining.map((p) => p.name).join(', ')}</> : 'All your sites are updated for today. 👍'}</div>
          <div className="mt-xs"><Link to={`/reports/${done.id}`} className="link">View submitted update</Link></div>
        </div>
      )}

      <form className="panel" onSubmit={submit}>
        <ErrorBox error={err} />
        <div className="form-grid">
          <Field label="Engineer Name"><input value={user.name} disabled /></Field>
          <Field label="Report Date"><input value={fmtDate(today)} disabled /></Field>
          <Field label="Site / Project Name *" full>
            <select value={f.projectId} onChange={set('projectId')} required>
              <option value="">— Select site —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.location ? ` – ${p.location}` : ''}{p.updatedToday ? '  ✓ updated today' : ''}</option>)}
            </select>
          </Field>
          {project?.instructions && <div className="instructions full small">📌 <b>Instructions:</b> {project.instructions}</div>}
          <Field label="Today's Work *" full>
            <div className="act-pick">
              {WORK_ACTIVITIES.map((a) => (
                <button type="button" key={a} className={`act-chip ${f.todayActivities.includes(a) ? 'on' : ''}`} onClick={() => toggleAct('todayActivities', a)}>{a}</button>
              ))}
            </div>
          </Field>
          <Field label="Today's Work – Notes (optional)" full><textarea rows={2} value={f.todayProgress} onChange={set('todayProgress')} placeholder="Any extra detail about today's work" /></Field>
          <Field label="Work Completed Today" full><textarea rows={2} value={f.workCompleted} onChange={set('workCompleted')} /></Field>
          <Field label="Tomorrow's Work Plan" full>
            <div className="act-pick">
              {WORK_ACTIVITIES.map((a) => (
                <button type="button" key={a} className={`act-chip ${f.tomorrowActivities.includes(a) ? 'on' : ''}`} onClick={() => toggleAct('tomorrowActivities', a)}>{a}</button>
              ))}
            </div>
          </Field>
          <Field label="Tomorrow's Plan – Notes (optional)" full><textarea rows={2} value={f.tomorrowPlan} onChange={set('tomorrowPlan')} placeholder="Any extra detail about tomorrow's plan" /></Field>
          <Field label="Material Required"><input value={f.materialRequired} onChange={set('materialRequired')} placeholder="e.g. MS Flat, Fabric" /></Field>
          <Field label="Material Status">
            <select value={f.materialStatus} onChange={set('materialStatus')} disabled={!f.materialRequired.trim()}>
              <option>Required</option><option>Ordered</option><option>Delivered</option>
            </select>
          </Field>
          <Field label="Project Status">
            <select value={f.projectStatus} onChange={set('projectStatus')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          </Field>
          <Field label="Issues or Challenges" full><textarea rows={2} value={f.issues} onChange={set('issues')} /></Field>
          <Field label="Additional Remarks" full><textarea rows={2} value={f.remarks} onChange={set('remarks')} /></Field>
        </div>

        <div className="label mt">Site Visit Photos ({photos.length}/20)</div>
        <div className="photo-pick">
          {photos.map((p, i) => (
            <div key={p.url} className="pick-thumb"><img src={p.url} alt="" /><button type="button" onClick={() => removePhoto(i)} aria-label="Remove"><X size={14} /></button></div>
          ))}
          <button type="button" className="pick-add" onClick={openCamera}><Camera size={22} /><span>Camera</span></button>
          <button type="button" className="pick-add" onClick={() => galleryRef.current.click()}><ImagePlus size={22} /><span>Gallery</span></button>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        {camOpen && <CameraCapture onCapture={addShot} onClose={() => setCamOpen(false)} onFallback={() => { setCamOpen(false); cameraRef.current.click(); }} />}
        <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />

        <div className="form-actions sticky">
          <button className="btn primary block" disabled={busy}><Send size={18} /> {busy ? 'Submitting…' : 'Submit Update'}</button>
        </div>
      </form>
    </div>
  );
}
