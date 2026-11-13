import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Users, Pencil, Phone, KeyRound, Copy, Check, RefreshCw, Eye, EyeOff, Search, ShieldCheck, HardHat, Power, MessageCircle, Trash2 } from 'lucide-react';
import { api, fmtDateTime } from '../api.js';
import { useApi } from '../hooks.js';
import { useAuth } from '../auth.jsx';
import { Loader, ErrorBox, Empty, Modal, Field, Badge } from '../components/ui.jsx';

const roleLabel = (r) => (r === 'head' ? 'Execution Head' : 'Execution Team');
const slug = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 30);

function PasswordInput({ value, onChange, required }) {
  const [show, setShow] = useState(true);
  const gen = async () => onChange((await api('/users/generate-password')).password);
  return (
    <div className="pw-row">
      <div className="ifield grow">
        <input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} required={required} minLength={8} placeholder="Min 8 characters" autoComplete="new-password" />
        <button type="button" className="eye" onClick={() => setShow((s) => !s)} aria-label="Show password">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
      </div>
      <button type="button" className="btn ghost" onClick={gen}><RefreshCw size={15} /> Generate</button>
    </div>
  );
}

/* Designation dropdown with "+ Add new designation" */
const ADD = '__add__';
function DesignationSelect({ value, onChange }) {
  const [list, setList] = useState([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('/designations').then(setList).catch(() => setList(['FABRICATION ENGINEER', 'TECHNO COMMERCIAL MANAGER', 'SENIOR SITE ENGINEER'])); }, []);
  const options = value && !list.includes(value) ? [...list, value] : list;

  const save = async () => {
    setErr('');
    if (name.trim().length < 2) return setErr('Enter the designation');
    setBusy(true);
    try {
      const d = await api('/designations', { method: 'POST', body: { name } });
      setList((l) => (l.includes(d.name) ? l : [...l, d.name].sort()));
      onChange(d.name);
      setAdding(false); setName('');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  if (adding) {
    return (
      <div>
        <div className="pw-row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PROJECT MANAGER" autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') setAdding(false); }} />
          <button type="button" className="btn primary" onClick={save} disabled={busy}>{busy ? 'Adding…' : 'Add'}</button>
          <button type="button" className="btn ghost" onClick={() => { setAdding(false); setErr(''); }}>Cancel</button>
        </div>
        {err && <span className="hint danger">{err}</span>}
      </div>
    );
  }
  return (
    <select value={value || ''} onChange={(e) => (e.target.value === ADD ? setAdding(true) : onChange(e.target.value))}>
      <option value="">— Select designation —</option>
      {options.map((d) => <option key={d} value={d}>{d}</option>)}
      <option value={ADD}>＋ Add new designation…</option>
    </select>
  );
}

/* Shown once after creating a login or resetting a password */
function CredentialsCard({ data, onClose }) {
  const { user, credentials: c } = data;
  const [copied, setCopied] = useState(false);
  const portal = window.location.origin;
  const text = `Execution Portal login – Tesco Structures\n\nName: ${user.name}\nRole: ${roleLabel(user.role)}\nPortal: ${portal}\nUsername: ${c.username}${c.employeeId ? `\nEmployee ID: ${c.employeeId}` : ''}\nPassword: ${c.password}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const digits = (user.phone || '').replace(/\D/g, '');
  const wa = `https://wa.me/${digits ? (digits.length === 10 ? '91' + digits : digits) : ''}?text=${encodeURIComponent(text)}`;
  return (
    <Modal title="Login credentials ready" onClose={onClose}>
      <div className="cred">
        <div className="cred-head"><div className="avatar">{user.name[0]}</div><div><b>{user.name}</b><div className="muted small">{roleLabel(user.role)}</div></div></div>
        <dl>
          <dt>Portal</dt><dd>{portal}</dd>
          <dt>Username</dt><dd className="mono">{c.username}</dd>
          {c.employeeId && <><dt>Employee ID</dt><dd className="mono">{c.employeeId}</dd></>}
          <dt>Password</dt><dd className="mono strong">{c.password}</dd>
        </dl>
        <div className="alert info small">The password is shown only now. Share it with the team member — only you (Execution Head) can reset it later.</div>
        <div className="cred-actions">
          <button className="btn primary" onClick={copy}>{copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy details</>}</button>
          <a className="btn ghost wa" href={wa} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Share on WhatsApp</a>
          <button className="btn ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    </Modal>
  );
}

function MemberForm({ member, onClose, onSaved }) {
  const { user: me } = useAuth();
  const isNew = !member;
  const [f, setF] = useState({
    role: member?.role || 'engineer', name: member?.name || '', employeeId: member?.employeeId || '', username: member?.username || '',
    phone: member?.phone || '', email: member?.email || '', designation: member?.designation || '', password: '',
  });
  const [userEdited, setUserEdited] = useState(!isNew);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((o) => ({ ...o, [k]: v, ...(k === 'name' && !userEdited ? { username: slug(v) } : {}) }));
  };
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (isNew) onSaved(await api('/users', { method: 'POST', body: f }));
      else { await api(`/users/${member.id}`, { method: 'PUT', body: { name: f.name, employeeId: f.employeeId, phone: f.phone, email: f.email, designation: f.designation, role: f.role } }); onSaved(null); }
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };
  return (
    <Modal title={isNew ? 'Create Login for Team Member' : `Edit ${member.name}`} onClose={onClose} wide>
      <form onSubmit={submit}>
        <ErrorBox error={err} />
        <div className="role-toggle">
          {[['engineer', HardHat, 'Execution Team', 'Engineer – submits daily site updates'], ['head', ShieldCheck, 'Execution Head', 'Admin – full access to all projects']].map(([v, I, t, d]) => (
            <button type="button" key={v} disabled={member?.id === me.id} className={f.role === v ? 'on' : ''} onClick={() => setF({ ...f, role: v })}>
              <I size={20} /><div><b>{t}</b><span>{d}</span></div>
            </button>
          ))}
        </div>
        <div className="form-grid">
          <Field label="Full Name *"><input value={f.name} onChange={set('name')} required autoFocus /></Field>
          <Field label="Employee ID" hint="Optional – can also be used to log in"><input value={f.employeeId} onChange={set('employeeId')} placeholder="e.g. EMP012" /></Field>
          <Field label="Username *" hint={isNew ? 'Used to log in. Auto-filled from the name.' : 'Username cannot be changed'}>
            <input value={f.username} onChange={(e) => { setUserEdited(true); setF({ ...f, username: e.target.value.toLowerCase().replace(/\s+/g, '') }); }} required disabled={!isNew} autoCapitalize="none" />
          </Field>
          <Field label="Phone" hint="Used for WhatsApp sharing"><input value={f.phone} onChange={set('phone')} inputMode="tel" /></Field>
          <Field label="Email"><input type="email" value={f.email} onChange={set('email')} /></Field>
          <Field label="Designation" hint="Pick from the list or add a new one"><DesignationSelect value={f.designation} onChange={(v) => setF((o) => ({ ...o, designation: v }))} /></Field>
          {isNew && (
            <>
              <Field label="Password" full hint="Leave empty to auto-generate a password"><PasswordInput value={f.password} onChange={(v) => setF({ ...f, password: v })} /></Field>
            </>
          )}
        </div>
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : isNew ? <><KeyRound size={16} /> Create Login</> : 'Save Changes'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ResetForm({ member, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { onDone(await api(`/users/${member.id}/reset-password`, { method: 'POST', body: { password } })); }
    catch (ex) { setErr(ex.message); }
  };
  return (
    <Modal title={`Reset password – ${member.name}`} onClose={onClose}>
      <form onSubmit={submit}>
        <ErrorBox error={err} />
        <Field label="New Password" hint="Leave empty to auto-generate"><PasswordInput value={password} onChange={setPassword} /></Field>
        <div className="form-actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary"><KeyRound size={16} /> Reset Password</button></div>
      </form>
    </Modal>
  );
}

export default function Engineers() {
  const { user: me } = useAuth();
  const { data, error, loading, reload } = useApi('/users');
  const [edit, setEdit] = useState(null);
  const [reset, setReset] = useState(null);
  const [creds, setCreds] = useState(null);
  const [tab, setTab] = useState('engineer');
  const [q, setQ] = useState('');
  const list = useMemo(() => (data || []).filter((u) => (tab === 'all' || u.role === tab) && (!q || [u.name, u.username, u.employeeId, u.phone].some((v) => (v || '').toLowerCase().includes(q.toLowerCase())))), [data, tab, q]);
  const count = (r) => (data || []).filter((u) => u.role === r).length;
  const remove = async (u) => {
    if (!window.confirm(`Delete the login for ${u.name}? This cannot be undone.`)) return;
    try { await api(`/users/${u.id}`, { method: 'DELETE' }); reload(); } catch (e) { alert(e.message); }
  };
  const toggle = async (u) => {
    if (!window.confirm(`${u.active ? 'Disable' : 'Enable'} login for ${u.name}?`)) return;
    try { await api(`/users/${u.id}`, { method: 'PUT', body: { active: !u.active } }); reload(); } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="page-head">
        <div><h2>Team & Logins</h2><div className="muted">Create login credentials for team members and manage access</div></div>
        <button className="btn primary" onClick={() => setEdit({})}><UserPlus size={18} /> Create Login</button>
      </div>
      <div className="filters">
        <div className="seg">
          <button className={tab === 'engineer' ? 'on' : ''} onClick={() => setTab('engineer')}>Execution Team ({count('engineer')})</button>
          <button className={tab === 'head' ? 'on' : ''} onClick={() => setTab('head')}>Execution Heads ({count('head')})</button>
          <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>All</button>
        </div>
        <div className="search"><Search size={16} /><input placeholder="Search name, username, employee ID" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <ErrorBox error={error} />
      {loading && !data ? <Loader /> : list.length === 0 ? (
        <Empty icon={Users} title={q ? 'No matching team members' : 'No team members yet'}>{!q && <button className="btn primary mt" onClick={() => setEdit({})}><UserPlus size={16} /> Create the first login</button>}</Empty>
      ) : (
        <div className="eng-grid">
          {list.map((e) => (
            <div key={e.id} className={`panel eng-card ${e.active ? '' : 'inactive'}`}>
              <div className="eng-top">
                <div className={`avatar ${e.role === 'head' ? 'head' : ''}`}>{e.name[0]}</div>
                <div className="grow">
                  <div className="eng-name">{e.name} {e.id === me.id && <span className="chip">You</span>}</div>
                  <div className="muted small">{e.designation || roleLabel(e.role)}</div>
                  {e.phone && <a className="small link" href={`tel:${e.phone}`}><Phone size={12} /> {e.phone}</a>}
                </div>
                <span className={`badge ${e.active ? 'b-green' : 'b-gray'}`}>{e.active ? 'Active' : 'Disabled'}</span>
              </div>

              <div className="login-box">
                <div><span>Username</span><b className="mono">{e.username}</b></div>
                <div><span>Employee ID</span><b className="mono">{e.employeeId || '—'}</b></div>
                <div><span>Role</span><b>{roleLabel(e.role)}</b></div>
                <div><span>Password set</span><b>{e.passwordSetAt ? fmtDateTime(e.passwordSetAt).split(',')[0] : '—'}</b></div>
              </div>

              {e.role === 'engineer' && (
                <>
                  <div className="eng-stats">
                    <div><b>{e.activeProjects}</b><span>Active</span></div>
                    <div><b>{e.reportsToday}</b><span>Updates today</span></div>
                    <div className={e.pendingToday ? 'warn' : ''}><b>{e.pendingToday}</b><span>Pending today</span></div>
                    <div className={e.delayedProjects ? 'danger' : ''}><b>{e.delayedProjects}</b><span>Delayed</span></div>
                  </div>
                  <div className="eng-projects">
                    {e.projects.length === 0 ? <span className="muted small">No projects assigned</span> : e.projects.map((p) => (
                      <Link key={p.id} to={`/projects/${p.id}`} className={`chip ${p.status === 'Completed' ? 'done' : ''}`}>{p.name}</Link>
                    ))}
                  </div>
                </>
              )}

              <div className="eng-foot">
                <button className="btn ghost sm" onClick={() => setEdit(e)}><Pencil size={14} /> Edit</button>
                <button className="btn ghost sm" onClick={() => setReset(e)}><KeyRound size={14} /> Reset Password</button>
                {e.id !== me.id && <button className={`btn ghost sm ${e.active ? 'danger-text' : ''}`} onClick={() => toggle(e)}><Power size={14} /> {e.active ? 'Disable' : 'Enable'}</button>}
                {e.id !== me.id && e.totalProjects === 0 && !e.lastReportAt && <button className="btn ghost sm danger-text" onClick={() => remove(e)} title="Only for logins that were never used"><Trash2 size={14} /> Delete</button>}
                {e.role === 'engineer' && <Link to={`/reports?engineerId=${e.id}`} className="link small push">Reports →</Link>}
              </div>
            </div>
          ))}
        </div>
      )}
      {edit && <MemberForm member={edit.id ? edit : null} onClose={() => setEdit(null)} onSaved={(res) => { setEdit(null); reload(); if (res) setCreds(res); }} />}
      {reset && <ResetForm member={reset} onClose={() => setReset(null)} onDone={(res) => { setReset(null); reload(); setCreds(res); }} />}
      {creds && <CredentialsCard data={creds} onClose={() => setCreds(null)} />}
    </div>
  );
}
